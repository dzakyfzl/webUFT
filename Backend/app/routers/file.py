from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import FileResponse, Response

from app.core.security import validate_token
from app.routers.helpers import apply_result
from app.services.dependencies import get_file_service
from app.services.file_service import FileService

router = APIRouter(prefix="/file", tags=["File"])


@router.get("/ambil/{file_id}")
async def ambil_file(file_id: int, response: Response, service: FileService = Depends(get_file_service)):
    result = service.get(file_id)
    response.status_code = result.status_code
    if result.status_code != 200:
        return result.payload
    entity = result.payload
    return FileResponse(path=entity.direktori, media_type=entity.jenis, headers={"Content-Disposition": "inline"}, filename=entity.nama)


@router.post("/tambah")
async def tambah_file(file: UploadFile, response: Response, user: Annotated[str, Depends(validate_token)], service: FileService = Depends(get_file_service)):
    return apply_result(await service.upload(file, user), response)


@router.delete("/hapus/{file_id}")
async def hapus_file(file_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: FileService = Depends(get_file_service)):
    return apply_result(service.delete(file_id, user), response)
