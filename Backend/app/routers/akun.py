from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.security import validate_refresh_token, validate_token
from app.routers.helpers import apply_result
from app.schemas.akun import AkunCreate, LogoutRequest
from app.services.akun_service import AkunService
from app.services.dependencies import get_akun_service

router = APIRouter(prefix="/akun", tags=["Akun"])


@router.post("/login")
def login(akun: AkunCreate, response: Response, service: AkunService = Depends(get_akun_service)):
    return apply_result(service.login(akun), response)


@router.post("/logout")
def logout(request: LogoutRequest, response: Response, user: Annotated[str, Depends(validate_token)], service: AkunService = Depends(get_akun_service)):
    return apply_result(service.logout(request.refresh_token, user), response)


@router.get("/access-token")
def refresh_token(refresh_token: Annotated[str, Depends(validate_refresh_token)], response: Response, service: AkunService = Depends(get_akun_service)):
    return apply_result(service.refresh(refresh_token), response)


@router.get("/me")
def get_current_user(user: Annotated[str, Depends(validate_token)], response: Response):
    return apply_result(AkunService.me(user), response)


@router.post("/tambah")
def tambah_akun(akun: AkunCreate, response: Response, user: Annotated[str, Depends(validate_token)], service: AkunService = Depends(get_akun_service)):
    return apply_result(service.create(akun, user), response)


@router.get("/list")
def list_akun(response: Response, user: Annotated[str, Depends(validate_token)], service: AkunService = Depends(get_akun_service)):
    return apply_result(service.list(user), response)


@router.delete("/hapus/{akun_id}")
def hapus_akun(akun_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: AkunService = Depends(get_akun_service)):
    return apply_result(service.delete(akun_id, user), response)


@router.get("/akses")
def get_user_access(user: Annotated[str, Depends(validate_token)], response: Response, service: AkunService = Depends(get_akun_service)):
    return apply_result(service.available_access(user), response)


@router.post("/tambah-akses/{akun_id}/{bidang_id}")
def tambah_akses(akun_id: int, bidang_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: AkunService = Depends(get_akun_service)):
    return apply_result(service.add_access(akun_id, bidang_id, user), response)


@router.delete("/hapus-akses/{akun_id}/{bidang_id}")
def hapus_akses(akun_id: int, bidang_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: AkunService = Depends(get_akun_service)):
    return apply_result(service.remove_access(akun_id, bidang_id, user), response)
