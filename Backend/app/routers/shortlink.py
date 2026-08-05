from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.security import validate_token
from app.routers.helpers import apply_result
from app.schemas.shortlink import ShortLinkCreate
from app.services.dependencies import get_link_service
from app.services.shortlink import ShortLinkService

router = APIRouter(prefix="/shortlink", tags=["Shortlink"])


@router.get("/r/{slug}")
def redirect_link(slug: str, response: Response, service: ShortLinkService = Depends(get_link_service)):
    """
    Endpoint publik: lookup shortlink berdasarkan slug.
    Frontend menggunakan response ini untuk melakukan client-side redirect.
    """
    return apply_result(service.redirect(slug), response)


@router.post("/tambah")
def tambah_link(link: ShortLinkCreate, response: Response, service: ShortLinkService = Depends(get_link_service)):
    """
    Endpoint publik: buat shortlink baru.
    Idempotent: jika slug sudah ada, kembalikan 409 Conflict.
    """
    return apply_result(service.create(link), response)


@router.get("/ambil/{link_id}")
def ambil_link(link_id: int, response: Response, service: ShortLinkService = Depends(get_link_service)):
    """Endpoint publik: ambil shortlink berdasarkan ID integer."""
    return apply_result(service.get(link_id), response)


@router.get("/list")
def list_link(
    response: Response,
    user: Annotated[dict, Depends(validate_token)],
    service: ShortLinkService = Depends(get_link_service),
):
    """Endpoint admin: list semua shortlink (butuh auth)."""
    return apply_result(service.list_all(user), response)


@router.delete("/hapus/{link_id}")
def hapus_link(
    link_id: int,
    response: Response,
    user: Annotated[dict, Depends(validate_token)],
    service: ShortLinkService = Depends(get_link_service),
):
    """Endpoint admin: hapus shortlink berdasarkan ID (butuh auth)."""
    return apply_result(service.delete(link_id, user), response)
