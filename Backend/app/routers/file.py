from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import FileResponse, Response

from app.core.database import SessionLocal
from app.core.security import validate_token
from app.routers.helpers import apply_result
from app.services.dependencies import get_file_service
from app.services.file_service import FileService
from app.repositories.file_repository import FileRepository

router = APIRouter(prefix="/file", tags=["File"])


@router.get("/ambil/{file_id}")
async def ambil_file(file_id: int, response: Response):
    """Serve file tanpa menahan DB connection selama streaming.

    Sebelumnya endpoint ini pakai Depends(get_file_service) yang menahan
    session DB selama FileResponse streaming ke client. Pada traffic tinggi
    ini menghabiskan seluruh connection pool (QueuePool limit reached).

    Fix: buka session sendiri, ambil metadata file, tutup session,
    LALU baru return FileResponse. Koneksi DB langsung dikembalikan ke pool.
    """
    db = SessionLocal()
    try:
        repo = FileRepository(db)
        entity = repo.get(file_id)
        if entity is None:
            response.status_code = 404
            return {"message": "File not found"}
        # Extract data yang dibutuhkan SEBELUM tutup session
        file_path = entity.direktori
        file_type = entity.jenis
        file_name = entity.nama
    except Exception as exc:
        print(f"Database error: {exc}")
        response.status_code = 500
        return {"message": "Database error"}
    finally:
        db.close()  # Koneksi langsung dikembalikan ke pool

    # FileResponse streaming terjadi SETELAH DB session ditutup
    return FileResponse(
        path=file_path,
        media_type=file_type,
        headers={"Content-Disposition": "inline"},
        filename=file_name,
    )


@router.post("/tambah")
async def tambah_file(file: UploadFile, response: Response, user: Annotated[str, Depends(validate_token)], service: FileService = Depends(get_file_service)):
    return apply_result(await service.upload(file, user), response)


@router.delete("/hapus/{file_id}")
async def hapus_file(file_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: FileService = Depends(get_file_service)):
    return apply_result(service.delete(file_id, user), response)
