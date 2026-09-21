from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.security import validate_token
from app.routers.helpers import apply_result
from app.schemas.partner import DataPartner, TogglePartner
from app.services.dependencies import get_partner_service
from app.services.partner_service import PartnerService

router = APIRouter(prefix="/partner", tags=["Partner"])


# ------------------------------------------------------------------
# Public endpoints
# ------------------------------------------------------------------

@router.get("/ambil-semua")
async def ambil_semua_partner(response: Response, service: PartnerService = Depends(get_partner_service)):
    """Publik: hanya partner aktif, sorted sponsor → media_partner → urutan ASC."""
    return apply_result(service.getAll(only_active=True), response)


@router.get("/ambil/{partner_id}")
async def ambil_partner(partner_id: int, response: Response, service: PartnerService = Depends(get_partner_service)):
    """Publik: ambil satu partner berdasarkan ID."""
    return apply_result(service.get(partner_id), response)


# ------------------------------------------------------------------
# Protected (admin) endpoints
# ------------------------------------------------------------------

@router.get("/admin/ambil-semua")
async def admin_ambil_semua_partner(
    response: Response,
    user: Annotated[dict, Depends(validate_token)],
    service: PartnerService = Depends(get_partner_service),
):
    """Admin: semua partner (aktif & nonaktif)."""
    return apply_result(service.getAll(only_active=False), response)


@router.post("/tambah")
async def tambah_partner(
    data: DataPartner,
    response: Response,
    user: Annotated[dict, Depends(validate_token)],
    service: PartnerService = Depends(get_partner_service),
):
    return apply_result(service.create(data, user), response)


@router.put("/edit/{partner_id}")
async def edit_partner(
    partner_id: int,
    data: DataPartner,
    response: Response,
    user: Annotated[dict, Depends(validate_token)],
    service: PartnerService = Depends(get_partner_service),
):
    return apply_result(service.update(partner_id, data, user), response)


@router.patch("/toggle/{partner_id}")
async def toggle_partner(
    partner_id: int,
    data: TogglePartner,
    response: Response,
    user: Annotated[dict, Depends(validate_token)],
    service: PartnerService = Depends(get_partner_service),
):
    return apply_result(service.toggle(partner_id, data.is_active, user), response)


@router.delete("/hapus/{partner_id}")
async def hapus_partner(
    partner_id: int,
    response: Response,
    user: Annotated[dict, Depends(validate_token)],
    service: PartnerService = Depends(get_partner_service),
):
    return apply_result(await service.delete(partner_id, user), response)
