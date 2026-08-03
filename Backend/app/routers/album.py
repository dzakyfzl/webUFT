from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.security import validate_token
from app.routers.helpers import apply_result
from app.schemas.album import DataAlbum
from app.services.album_service import AlbumService
from app.services.dependencies import get_album_service

router = APIRouter(prefix="/album", tags=["Album"])


@router.post("/tambah")
async def tambah_album(album_data: DataAlbum, response: Response, user: Annotated[str, Depends(validate_token)], service: AlbumService = Depends(get_album_service)):
    return apply_result(await service.create(album_data, user), response)


@router.put("/edit/{album_id}")
async def edit_album(album_id: int, album_data: DataAlbum, response: Response, user: Annotated[str, Depends(validate_token)], service: AlbumService = Depends(get_album_service)):
    return apply_result(service.update(album_id, album_data, user), response)


@router.get("/ambil/{album_id}")
async def ambil_album(album_id: int, response: Response, service: AlbumService = Depends(get_album_service)):
    return apply_result(service.get(album_id), response)


@router.get("/ambil-semua")
async def ambil_semua_album(response: Response, service: AlbumService = Depends(get_album_service)):
    return apply_result(service.getAll(), response)


@router.delete("/hapus/{album_id}")
async def hapus_album(album_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: AlbumService = Depends(get_album_service)):
    return apply_result(await service.delete(album_id, user), response)
