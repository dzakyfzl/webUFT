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
    prefix="/album",
    tags=["Album"]
)

class DataAlbum(BaseModel):
    nama: str
    deskripsi: str
@router.post("/tambah")
async def tambah_album(album_data: DataAlbum, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin" or "Kelola Galeri" not in user.get("access", []):
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        new_album = Album(nama=album_data.nama, deskripsi=album_data.deskripsi)
        db.add(new_album)
        db.commit()
        db.refresh(new_album)
        response.status_code = 200
        return {"message": "Album created successfully", "album_id": new_album.albumID}
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.put("/edit/{album_id}")
async def edit_album(album_id: int, album_data: DataAlbum, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin" or "Kelola Galeri" not in user.get("access", []):
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = update(Album).where(Album.albumID == album_id).values(nama=album_data.nama, deskripsi=album_data.deskripsi)
        result = db.execute(stmt)
        if result.rowcount == 0:
            response.status_code = 404
            return {"message": "Album not found"}
        db.commit()
        response.status_code = 200
        return {"message": "Album updated successfully"}
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.get("/ambil/{album_id}")
async def ambil_album(album_id: int, response: Response, db: Session = Depends(get_db)):
    db = SessionLocal()
    try:
        stmt_album = select(Album).where(Album.albumID == album_id)
        album = db.execute(stmt_album).scalar_one_or_none()
        if album is None:
            response.status_code = 404
            return {"message": "Album not found"}
            
        stmt_fotos = select(Foto).where(Foto.albumID == album_id)
        fotos = db.execute(stmt_fotos).scalars().all()
        
        response.status_code = 200
        return {
            "album": album,
            "fotos": fotos
        }
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.get("/ambil-semua")
async def ambil_semua_album(response: Response, db: Session = Depends(get_db)):
    db = SessionLocal()
    try:
        stmt = select(Album)
        results = db.execute(stmt).scalars().all()
        response.status_code = 200
        return results
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.delete("/hapus/{album_id}")
async def hapus_album(album_id: int, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin" or "Kelola Galeri" not in user.get("access", []):
        response.status_code = 403
        return {"message": "Unauthorized"}
    db = SessionLocal()
    try:
        stmt = select(Foto.fileID).where(Foto.albumID == album_id)
        file_ids = db.execute(stmt).scalars().all()
        for file_id in file_ids:
            await hapus_file(file_id, db)
        stmt2 = delete(Foto).where(Foto.albumID == album_id)
        db.execute(stmt2)
        stmt3 = delete(Album).where(Album.albumID == album_id)
        db.execute(stmt3)
        db.commit()
        response.status_code = 200
        return {"message": "Album deleted successfully"}
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()