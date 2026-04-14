import os
import shutil
from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select, func, insert, update
from Database.database import SessionLocal, get_db
from Database.models import Karya, File
from Feature.JWT.validate_token import validate_token
from sqlalchemy.orm import Session
from pydantic import BaseModel
from fastapi.responses import Response

router = APIRouter(
    prefix="/file",
    tags=["File"]
)

@router.get("/ambil/{file_id}")
async def ambil_file(file_id: int, response: Response, db: Session = Depends(get_db)):
    db = SessionLocal()
    try:
        stmt = select(File).where(File.fileID == file_id)
        result = db.execute(stmt).scalar_one_or_none()
        if result is None:
            response.status_code = 404
            return {"message": "File not found"}
        response.status_code = 200
        return FileResponse(path=result.direktori, media_type=result.jenis,headers={"Content-Disposition": "inline"}, filename=result.nama)
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()

@router.post("/tambah")
async def tambah_file(file: UploadFile,response:Response,user: Annotated[str,Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    if not file.content_type.startswith("image/"):
        response.status_code = 400
        return {"message": "Only image files are allowed"}
    try:
        filepath = os.path.join("/media", file.filename)
        try:
            with open(filepath, "wb+") as file_object:
                shutil.copyfileobj(file.file, file_object)
        except Exception as e:
            print("ERROR : ",e)
            response.status_code = 500
            return {"message": "There was an error uploading the file"}
        finally:
            await file.close()
        
        

        new_file = File(nama=file.filename, direktori=filepath, jenis=file.content_type, ukuran=os.path.getsize(filepath))
        db.add(new_file)
        db.commit()
        db.refresh(new_file)
        
        return {"message": "File uploaded successfully", "file_id": new_file.fileID}
    except Exception as e:
        print(f"Error uploading file: {e}")
        return {"message": "Error uploading file"}

@router.delete("/hapus/{file_id}")
async def hapus_file(file_id: int, response: Response,user: Annotated[str,Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    try:
        stmt = select(File).where(File.fileID == file_id)
        result = db.execute(stmt).scalar_one_or_none()
        if result is None:
            response.status_code = 404
            return {"message": "File not found"}
        try:
            os.remove(result.direktori)
        except Exception as e:
            print(f"Error deleting file from system: {e}")
            response.status_code = 500
            return {"message": "Error deleting file from system"}
        
        # Hapus informasi file dari database
        db.delete(result)
        db.commit()
        
        return {"message": "File deleted successfully"}
    except Exception as e:
        print(f"Error deleting file: {e}")
        return {"message": "Error deleting file"}