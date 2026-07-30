from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.security import validate_token
from app.routers.helpers import apply_result
from app.schemas.foto import DataFoto
from app.services.dependencies import get_foto_service
from app.services.foto_service import FotoService

router = APIRouter(prefix="/foto", tags=["Foto"])


@router.get("/tambah/{album_id}")
async def tambah_foto(album_id: int, foto_data: DataFoto, response: Response, user: Annotated[str, Depends(validate_token)], service: FotoService = Depends(get_foto_service)):
    return apply_result(service.create(album_id, foto_data, user), response)


@router.delete("/hapus/{foto_id}")
async def hapus_foto(foto_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: FotoService = Depends(get_foto_service)):
    return apply_result(await service.delete(foto_id, user), response)


@router.put("/edit/{foto_id}")
async def edit_foto(foto_id: int, foto_data: DataFoto, response: Response, user: Annotated[str, Depends(validate_token)], service: FotoService = Depends(get_foto_service)):
    return apply_result(service.update(foto_id, foto_data, user), response)


@router.get("/ambil/{foto_id}")
async def ambil_foto(foto_id: int, response: Response, service: FotoService = Depends(get_foto_service)):
    return apply_result(service.get(foto_id), response)
