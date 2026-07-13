from typing import Annotated
import os

from fastapi import APIRouter, Depends
from flask import json
from sqlalchemy import and_, delete, select, func, insert, update
from Feature.file_deletion.main import hapus_file
from Feature.security.main import check_password_hash
from Database.database import SessionLocal, get_db
from Database.models import Album, File, Foto
from Feature.JWT.validate_token import validate_refresh_token, validate_token
from sqlalchemy.orm import Session
from pydantic import BaseModel
from fastapi.responses import Response
from dotenv import load_dotenv
from Feature.JWT.main import create_access_token, create_refresh_token, decode_token

router = APIRouter(
    prefix="/foto",
    tags=["Foto"]
)


class DataFoto(BaseModel):
    nama: str
    pemilik: str
    fileID: int
@router.get("/tambah/{album_id}")
async def tambah_foto(album_id: int, foto_data: DataFoto, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin" or "Kelola Galeri" not in user.get("access", []):
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        new_foto = Foto(nama=foto_data.nama, pemilik=foto_data.pemilik, fileID=foto_data.fileID, albumID=album_id)
        db.add(new_foto)
        db.commit()
        db.refresh(new_foto)
        response.status_code = 200
        return {"message": "Foto added successfully", "foto_id": new_foto.fotoID}
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.delete("/hapus/{foto_id}")
async def hapus_foto(foto_id: int, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin" or "Kelola Galeri" not in user.get("access", []):
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = select(Foto.fileID).where(Foto.fotoID == foto_id)
        file_id = db.execute(stmt).scalar_one_or_none()
        if file_id is None:
            response.status_code = 404
            return {"message": "Foto not found"}
        await hapus_file(file_id, db)
        stmt2 = delete(Foto).where(Foto.fotoID == foto_id)
        result2 = db.execute(stmt2)
        if result2.rowcount == 0:
            response.status_code = 404
            return {"message": "Foto not found"}
        db.commit()
        response.status_code = 200
        return {"message": "Foto deleted successfully"}
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.put("/edit/{foto_id}")
async def edit_foto(foto_id: int, foto_data: DataFoto, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin" or "Kelola Galeri" not in user.get("access", []):
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = select(Foto).where(Foto.fotoID == foto_id)
        foto = db.execute(stmt).scalar_one_or_none()
        if foto is None:
            response.status_code = 404
            return {"message": "Foto not found"}
        foto.nama = foto_data.nama
        foto.pemilik = foto_data.pemilik
        foto.fileID = foto_data.fileID
        db.commit()
        response.status_code = 200
        return {"message": "Foto updated successfully"}
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.get("/ambil/{foto_id}")
async def ambil_foto(foto_id: int, response: Response, db: Session = Depends(get_db)):
    db = SessionLocal()
    try:
        stmt = select(Foto).where(Foto.fotoID == foto_id)
        result = db.execute(stmt).scalar_one_or_none()
        if result is None:
            response.status_code = 404
            return {"message": "Foto not found"}
        response.status_code = 200
        return result
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()
