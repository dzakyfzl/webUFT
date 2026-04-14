from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, insert, update
from Database.database import SessionLocal, get_db
from Database.models import Acara, Karya
from Feature.JWT.validate_token import validate_token
from sqlalchemy.orm import Session
from pydantic import BaseModel
from fastapi.responses import Response
router = APIRouter(
    prefix="/karya",
    tags=["Karya"]
)

@router.get("/ambil/{acara_id}/{karya_id}")
def ambil_karya(karya_id: int, acara_id: int, response: Response, db: Session = Depends(get_db)):
    db = SessionLocal()
    try:
        stmt = select(Karya).where(Karya.karyaID == karya_id and Karya.acaraID == acara_id and Acara.status == "Aktif").join(Acara, Acara.acaraID == Karya.acaraID)
        result = db.execute(stmt).scalar_one_or_none()
        if result is None:
            response.status_code = 404
            return {"message": "Karya not found"}
        response.status_code = 200
        return result
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

class KaryaCreate(BaseModel):
    nama: str
    deskripsi: str
    pemilik: str
    acaraID: int
    fileID: int
@router.post("/tambah")
def tambah_karya(karya: KaryaCreate, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        new_karya = Karya(nama=karya.nama, deskripsi=karya.deskripsi, pemilik=karya.pemilik, acaraID=karya.acaraID, fileID=karya.fileID)
        db.add(new_karya)
        db.commit()
        db.refresh(new_karya)
        return new_karya
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()
    
@router.post("/edit/{karya_id}")
def edit_karya(karya_id: int, karya: KaryaCreate, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = select(Karya).where(Karya.karyaID == karya_id)
        result = db.execute(stmt).scalar_one_or_none()
        if result is None:
            response.status_code = 404
            return {"message": "Karya not found"}
        result.nama = karya.nama
        result.deskripsi = karya.deskripsi
        result.pemilik = karya.pemilik
        result.acaraID = karya.acaraID
        result.fileID = karya.fileID
        db.commit()
        db.refresh(result)
        return result
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.delete("/hapus/{karya_id}")
def hapus_karya(karya_id: int, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = select(Karya).where(Karya.karyaID == karya_id)
        result = db.execute(stmt).scalar_one_or_none()
        if result is None:
            response.status_code = 404
            return {"message": "Karya not found"}
        db.delete(result)
        db.commit()
        response.status_code = 200
        return {"message": "Karya deleted successfully"}
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.get("/list/{acara_id}")
def list_karya(acara_id: int, response: Response, db: Session = Depends(get_db)):
    db = SessionLocal()
    try:
        stmt = select(Karya).where(Karya.acaraID == acara_id)
        result = db.execute(stmt).scalars().all()
        response.status_code = 200
        return result
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()