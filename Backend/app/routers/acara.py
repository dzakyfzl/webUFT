from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.security import validate_token
from app.routers.helpers import apply_result
from app.schemas.acara import AcaraCreate
from app.services.acara_service import AcaraService
from app.services.dependencies import get_acara_service

router = APIRouter(prefix="/acara", tags=["Acara"])


@router.get("/ambil/{acara_id}")
async def ambil_acara(acara_id: int, response: Response, service: AcaraService = Depends(get_acara_service)):
    return apply_result(service.get_public(acara_id), response)


@router.get("/admin-ambil/{acara_id}")
async def ambil_acara(acara_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: AcaraService = Depends(get_acara_service)):
    return apply_result(service.get_admin(acara_id, user), response)


@router.post("/tambah")
async def tambah_acara(acara: AcaraCreate, response: Response, user: Annotated[str, Depends(validate_token)], service: AcaraService = Depends(get_acara_service)):
    return apply_result(service.create(acara, user), response)


@router.post("/edit/{acara_id}")
async def edit_acara(acara_id: int, acara: AcaraCreate, response: Response, user: Annotated[str, Depends(validate_token)], service: AcaraService = Depends(get_acara_service)):
    return apply_result(service.update(acara_id, acara, user), response)


@router.delete("/hapus/{acara_id}")
async def hapus_acara(acara_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: AcaraService = Depends(get_acara_service)):
    return apply_result(service.delete(acara_id, user), response)


@router.get("/list")
async def list_acara(response: Response, service: AcaraService = Depends(get_acara_service)):
    return apply_result(service.list_public(), response)


@router.get("/list-all")
async def list_acara(response: Response, user: Annotated[str, Depends(validate_token)], service: AcaraService = Depends(get_acara_service)):
    return apply_result(service.list_all(user), response)
