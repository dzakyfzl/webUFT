from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.security import validate_token
from app.routers.helpers import apply_result
from app.schemas.karya import KaryaCreate
from app.services.dependencies import get_karya_service
from app.services.karya_service import KaryaService

router = APIRouter(prefix="/karya", tags=["Karya"])


@router.get("/ambil/{acara_id}/{karya_id}")
def ambil_karya(karya_id: int, acara_id: int, response: Response, service: KaryaService = Depends(get_karya_service)):
    return apply_result(service.get_public(acara_id, karya_id), response)


@router.post("/tambah")
def tambah_karya(karya: KaryaCreate, response: Response, user: Annotated[str, Depends(validate_token)], service: KaryaService = Depends(get_karya_service)):
    return apply_result(service.create(karya, user), response)


@router.post("/edit/{karya_id}")
def edit_karya(karya_id: int, karya: KaryaCreate, response: Response, user: Annotated[str, Depends(validate_token)], service: KaryaService = Depends(get_karya_service)):
    return apply_result(service.update(karya_id, karya, user), response)


@router.delete("/hapus/{karya_id}")
def hapus_karya(karya_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: KaryaService = Depends(get_karya_service)):
    return apply_result(service.delete(karya_id, user), response)


@router.get("/list/{acara_id}")
def list_karya(acara_id: int, response: Response, service: KaryaService = Depends(get_karya_service)):
    return apply_result(service.list(acara_id), response)
