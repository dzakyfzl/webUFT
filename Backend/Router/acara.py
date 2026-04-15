import os
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select, func, insert, update
from Database.database import SessionLocal, get_db
from Database.models import Acara, File, Jawaban, Karya, Pertanyaan, Pilihan, Responden
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
            response.status_code = 404
            return {"message": "Acara not found"}
        
        # PERBAIKAN: Menambahkan fileID dan status ke dalam proses update database
        db.execute(update(Acara).where(Acara.acaraID == acara_id).values(
            nama=acara.nama, 
            deskripsi=acara.deskripsi, 
            tempat=acara.tempat, 
            waktu=acara.waktu,
            fileID=acara.fileID, 
            status=acara.status
        ))
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
async def hapus_acara(acara_id: int, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    
    # HAPUS: db = SessionLocal()

    try:
        # 1. Cari Acara
        stmt = select(Acara).where(Acara.acaraID == acara_id)
        acara = db.execute(stmt).scalar_one_or_none()
        
        if acara is None:
            response.status_code = 404
            return {"message": "Acara not found"}

        # Simpan fileID dari Acara untuk dihapus nanti
        acara_file_id = acara.fileID

        # 2. Ambil semua path file dari Karya yang terkait dengan Acara ini
        stmt_file_karya = (
            select(File.direktori)
            .join(Karya, Karya.fileID == File.fileID)
            .where(Karya.acaraID == acara_id)
        )
        daftar_path_file_karya = db.execute(stmt_file_karya).scalars().all()
        
        # Ambil ID file Karya untuk dihapus dari DB nanti
        stmt_file_karya_id = select(Karya.fileID).where(Karya.acaraID == acara_id)
        result_file_karya_ids = db.execute(stmt_file_karya_id).scalars().all()

        # ==========================================
        # FASE PENGHAPUSAN DATABASE (Eksekusi dari Child terbawah ke Parent)
        # ==========================================
        
        # Hapus Pilihan yang terkait dengan Karya dari Acara ini
        db.execute(delete(Pilihan).where(Pilihan.karyaID.in_(
            select(Karya.karyaID).where(Karya.acaraID == acara_id)
        )))

        # PENTING: Hapus Jawaban yang terkait dengan Pertanyaan atau Responden di Acara ini
        db.execute(delete(Jawaban).where(Jawaban.pertanyaanID.in_(
            select(Pertanyaan.pertanyaanID).where(Pertanyaan.acaraID == acara_id)
        )))

        # Hapus Pertanyaan, Responden, dan Karya
        db.execute(delete(Pertanyaan).where(Pertanyaan.acaraID == acara_id))
        db.execute(delete(Responden).where(Responden.acaraID == acara_id))
        db.execute(delete(Karya).where(Karya.acaraID == acara_id))

        # Hapus Acara (Parent utama)
        db.execute(delete(Acara).where(Acara.acaraID == acara_id))

        # Hapus File yang dimiliki oleh Karya
        if result_file_karya_ids:
            # Filter None values jika ada Karya yang tidak punya file
            valid_file_ids = [fid for fid in result_file_karya_ids if fid is not None]
            if valid_file_ids:
                db.execute(delete(File).where(File.fileID.in_(valid_file_ids)))

        # Hapus File utama milik Acara
        path_file_acara = None
        if acara_file_id:
            path_file_acara = db.execute(select(File.direktori).where(File.fileID == acara_file_id)).scalar_one_or_none()
            db.execute(delete(File).where(File.fileID == acara_file_id))

        # JIKA SEMUA BERHASIL, BARU KITA COMMIT
        db.commit()

        # ==========================================
        # FASE PENGHAPUSAN FILE FISIK OS
        # ==========================================
        
        # Hapus file-file Karya
        for path_file in daftar_path_file_karya:
            if path_file and os.path.exists(path_file):
                try:
                    os.remove(path_file)
                except Exception as e:
                    print(f"Peringatan: Gagal menghapus file karya {path_file}. Detail: {e}")

        # Hapus file utama Acara
        if path_file_acara and os.path.exists(path_file_acara):
            try:
                os.remove(path_file_acara)
            except Exception as e:
                print(f"Peringatan: Gagal menghapus file acara {path_file_acara}. Detail: {e}")

        response.status_code = 200
        return {'message': 'Acara deleted successfully'}

    except Exception as e:
        db.rollback() # Wajib ada agar DB tidak corrupt jika terjadi gagal hapus di tengah jalan
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": f"Database error: {str(e)}"}

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