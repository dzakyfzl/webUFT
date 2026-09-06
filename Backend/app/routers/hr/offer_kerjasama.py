"""Router for Offer Kerja Sama / Job Masuk.

HIDDEN module — returns 404 for unauthorized users (hidden=True).
Requires 'Kelola Offer Masuk' bidang access.
Ref: PRD §3.5b
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.core.access_guard import require_access
from app.routers.helpers import apply_result
from app.schemas.hr.offer import OfferKerjasamaCreate, OfferKerjasamaUpdate
from app.services.hr.dependencies import get_offer_kerjasama_service
from app.services.hr.offer_kerjasama_service import OfferKerjasamaService

router = APIRouter(prefix="/offer/kerjasama", tags=["HR - Offer Kerja Sama/Job"])

_access = require_access("Kelola Offer Masuk", hidden=True)


@router.post("/")
def create_offer_kerjasama(
    data: OfferKerjasamaCreate,
    response: Response,
    user: dict = Depends(_access),
    service: OfferKerjasamaService = Depends(get_offer_kerjasama_service),
):
    """Tambah offer kerja sama/job masuk baru."""
    return apply_result(service.create(data, user), response)


@router.get("/")
def list_offer_kerjasama(
    response: Response,
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(_access),
    service: OfferKerjasamaService = Depends(get_offer_kerjasama_service),
):
    """List offer kerja sama/job masuk."""
    return apply_result(service.list(status=status, search=search, skip=skip, limit=limit), response)


@router.get("/{offer_id}")
def get_offer_kerjasama(
    offer_id: int,
    response: Response,
    user: dict = Depends(_access),
    service: OfferKerjasamaService = Depends(get_offer_kerjasama_service),
):
    """Detail offer kerja sama/job masuk + audit log."""
    return apply_result(service.get(offer_id), response)


@router.patch("/{offer_id}")
def update_offer_kerjasama(
    offer_id: int,
    data: OfferKerjasamaUpdate,
    response: Response,
    user: dict = Depends(_access),
    service: OfferKerjasamaService = Depends(get_offer_kerjasama_service),
):
    """Update offer kerja sama/job masuk."""
    return apply_result(service.update(offer_id, data, user), response)


@router.delete("/{offer_id}")
def delete_offer_kerjasama(
    offer_id: int,
    response: Response,
    user: dict = Depends(_access),
    service: OfferKerjasamaService = Depends(get_offer_kerjasama_service),
):
    """Hapus offer kerja sama/job masuk."""
    return apply_result(service.delete(offer_id, user), response)
