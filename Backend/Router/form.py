import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, insert, update
from Database.database import SessionLocal, get_db
from Database.models import Acara, Karya, Pilihan, Responden, Token
from Feature.JWT.validate_token import validate_token, verify_is_guest
from Feature.JWT.main import create_access_token, create_refresh_token
from sqlalchemy.orm import Session
from pydantic import BaseModel
from fastapi.responses import Response, StreamingResponse

router = APIRouter(
    prefix="/form",
    tags=["Form"]
)

class FormCreate(BaseModel):
    nama: str
    prodi_instansi: str
    nomor: str
    nim: str
    karyaID: int
@router.post("/isi/{acara_id}")
def isi_form(acara_id:int, isi: FormCreate, isGuest: Annotated[str, Depends(verify_is_guest)],response: Response, db: Session = Depends(get_db)):
    db = SessionLocal()
    token_count = db.execute(select(func.count("*")).select_from(Responden).where(Responden.tokenID == isGuest, Responden.acaraID == acara_id)).scalar_one_or_none()
    if isGuest != "Baru" or token_count > 0:
        response.status_code = 403
        return {"message": "Unauthorized"}
    
    token = create_refresh_token(isi.nama, "Pengguna")
    try:
        new_token = Token(tokenID=token)
        db.add(new_token)
        db.commit()
        db.refresh(new_token)
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    try:
        new_responden = Responden(acaraID=acara_id, nama=isi.nama, prodi_instansi=isi.prodi_instansi, nomor=isi.nomor, nim=isi.nim, tokenID=token)
        db.add(new_responden)
        db.commit()
        db.refresh(new_responden)
        db.add(Pilihan(respID=new_responden.respID, karyaID=isi.karyaID))
        db.commit()
        response.status_code = 200
        return {"message": "Form submitted successfully", "refresh_token": token}
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.get("/list/{acara_id}")
def list_responden(acara_id: int, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = select(Responden).where(Responden.acaraID == acara_id)
        result = db.execute(stmt).scalars().all()
        response.status_code = 200
        return result
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.get("/urutkan-karya/{acara_id}")
def urutkan_karya(acara_id: int, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = select(Karya.nama, Karya.karyaID,Karya.fileID, Karya.deskripsi, Karya.pemilik, func.count(Pilihan.karyaID).label("jumlah_pilihan")).join(Pilihan, Pilihan.karyaID == Karya.karyaID, isouter=True).where(Karya.acaraID == acara_id).group_by(Karya).order_by(func.count(Pilihan.karyaID).desc())
        result = db.execute(stmt).all()
        response.status_code = 200
        return [
            {
                "nama": row[0],
                "karyaID": row[1],
                "fileID": row[2],
                "deskripsi": row[3],
                "pemilik": row[4],
                "jumlah_pilihan": row[5],
            }
            for row in result
        ]
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.get("/download-csv/{acara_id}")
def download_csv(acara_id: int, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = select(Responden.nama, Responden.prodi_instansi, Responden.nomor, Responden.nim, Karya.nama.label("karya_nama")).join(Pilihan, Pilihan.respID == Responden.respID).join(Karya, Karya.karyaID == Pilihan.karyaID).where(Responden.acaraID == acara_id)
        result = db.execute(stmt).all()
        stmt_acara = select(Acara.nama).where(Acara.acaraID == acara_id)
        acara_nama = db.execute(stmt_acara).scalar_one_or_none()
        
        csv_data = []
        i : int = 0
        for row in result:
            csv_data.append({"nama":row.nama,"prodi_instansi":row.prodi_instansi,"nomor":row.nomor,"nim":row.nim,"karya":row.karya_nama})
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["nama", "prodi_instansi", "nomor", "nim", "karya"])
        writer.writeheader()
        writer.writerows(csv_data)
        output.seek(0)
 
        safe_acara_nama = str(acara_nama).replace(" ", "_") if acara_nama else f"Acara_{acara_id}"

        return StreamingResponse(
            iter([output.getvalue()]), 
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="data_absensi_{safe_acara_nama}.csv"'}
        )
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()