import os

from fastapi import Depends, File
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from Database.database import get_db


async def hapus_file(file_id: int, db: Session = Depends(get_db)):
    try:
        stmt = select(File.direktori).where(File.fileID == file_id)
        file_path = db.execute(stmt).scalar_one_or_none()
        if file_path is None:
            return {"message": "File not found"}
        if os.path.exists(file_path):
            os.remove(file_path)
        stmt2 = delete(File).where(File.fileID == file_id)
        result = db.execute(stmt2)
        if result.rowcount == 0:
            return {"message": "File not found"}
        db.commit()
        return {"message": "File deleted successfully"}
    except Exception as e:
        print(f"Database error: {e}")
        return {"message": "Database error"}