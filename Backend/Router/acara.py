from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, insert, update
from Database.database import SessionLocal, get_db
from Database.models import Acara
from Feature.JWT.validate_token import validate_token
from sqlalchemy.orm import Session
from pydantic import BaseModel
from fastapi.responses import Response


router = APIRouter(
    prefix="/acara",
    tags=["Acara"]
)

@router.get("/ambil/{acara_id}")
async def ambil_acara(acara_id: int, response: Response, db: Session = Depends(get_db)):
    db = SessionLocal()
    try:
        stmt = select(Acara).where(Acara.acaraID == acara_id and Acara.status == "Aktif")
        result = db.execute(stmt).scalar_one_or_none()
        if result is None:
            response.status_code = 404
            return {"message": "Acara not found"}
        response.status_code = 200
        return result
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.get("/admin-ambil/{acara_id}")
async def ambil_acara(acara_id: int, response: Response, user: Annotated[str,Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = select(Acara).where(Acara.acaraID == acara_id)
        result = db.execute(stmt).scalar_one_or_none()
        if result is None:
            response.status_code = 404
            return {"message": "Acara not found"}
        response.status_code = 200
        return result
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

class AcaraCreate(BaseModel):
    nama: str
    deskripsi: str
    tempat: str
    waktu: str
    fileID: int
    status: str

@router.post("/tambah")
async def tambah_acara(acara: AcaraCreate, response: Response, user: Annotated[str, Depends(validate_token)] , db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        new_acara = Acara(nama=acara.nama, deskripsi=acara.deskripsi, tempat=acara.tempat, waktu=acara.waktu, fileID=acara.fileID, status=acara.status)
        db.add(new_acara)
        db.commit()
        db.refresh(new_acara)
        return new_acara
    finally:
        db.close()

@router.post("/edit/{acara_id}")
async def edit_acara(acara_id: int, acara: AcaraCreate, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = select(Acara).where(Acara.acaraID == acara_id)
        result = db.execute(stmt).scalar_one_or_none()
        if result is None:
            return {"message": "Acara not found"}
        result.nama = acara.nama
        result.deskripsi = acara.deskripsi
        result.tempat = acara.tempat
        result.waktu = acara.waktu
        db.execute(update(Acara).where(Acara.acaraID == acara_id).values(nama=acara.nama, deskripsi=acara.deskripsi, tempat=acara.tempat, waktu=acara.waktu))
        db.commit()
        response.status_code = 200
        return {'message': 'Acara updated successfully'}
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.delete("/hapus/{acara_id}")
async def hapus_acara(acara_id: int,response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = select(Acara).where(Acara.acaraID == acara_id)
        result = db.execute(stmt).scalar_one_or_none()
        if result is None:
            return {"message": "Acara not found"}
        db.delete(result)
        db.commit()
        response.status_code = 200
        return {'message': 'Acara deleted successfully'}
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.get("/list")
async def list_acara(response: Response, db: Session = Depends(get_db)):
    db = SessionLocal()
    try:
        stmt = select(Acara).where(Acara.status == "Aktif")
        result = db.execute(stmt).scalars().all()
        response.status_code = 200
        return result
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.get("/list-all")
async def list_acara(response: Response, user:Annotated[str,Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = select(Acara)
        result = db.execute(stmt).scalars().all()
        response.status_code = 200
        return result
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()