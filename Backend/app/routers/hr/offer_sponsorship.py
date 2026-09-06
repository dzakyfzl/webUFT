"""Router for Offer Sponsorship Masuk.

HIDDEN module — returns 404 for unauthorized users (hidden=True).
Requires 'Kelola Offer Masuk' bidang access.
Ref: PRD §3.5
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.core.access_guard import require_access
from app.routers.helpers import apply_result
from app.schemas.hr.offer import OfferSponsorshipCreate, OfferSponsorshipUpdate
from app.services.hr.dependencies import get_offer_sponsorship_service
from app.services.hr.offer_sponsorship_service import OfferSponsorshipService

router = APIRouter(prefix="/offer/sponsorship", tags=["HR - Offer Sponsorship Masuk"])

# All endpoints use hidden=True → 404 instead of 403 for unauthorized users
_access = require_access("Kelola Offer Masuk", hidden=True)


@router.post("/")
def create_offer_sponsorship(
    data: OfferSponsorshipCreate,
    response: Response,
    user: dict = Depends(_access),
    service: OfferSponsorshipService = Depends(get_offer_sponsorship_service),
):
    """Tambah offer sponsorship masuk baru."""
    return apply_result(service.create(data, user), response)


@router.get("/")
def list_offer_sponsorship(
    response: Response,
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(_access),
    service: OfferSponsorshipService = Depends(get_offer_sponsorship_service),
):
    """List offer sponsorship masuk."""
    return apply_result(service.list(status=status, search=search, skip=skip, limit=limit), response)


@router.get("/{offer_id}")
def get_offer_sponsorship(
    offer_id: int,
    response: Response,
    user: dict = Depends(_access),
    service: OfferSponsorshipService = Depends(get_offer_sponsorship_service),
):
    """Detail offer sponsorship masuk + audit log."""
    return apply_result(service.get(offer_id), response)


@router.patch("/{offer_id}")
def update_offer_sponsorship(
    offer_id: int,
    data: OfferSponsorshipUpdate,
    response: Response,
    user: dict = Depends(_access),
    service: OfferSponsorshipService = Depends(get_offer_sponsorship_service),
):
    """Update offer sponsorship masuk."""
    return apply_result(service.update(offer_id, data, user), response)


@router.delete("/{offer_id}")
def delete_offer_sponsorship(
    offer_id: int,
    response: Response,
    user: dict = Depends(_access),
    service: OfferSponsorshipService = Depends(get_offer_sponsorship_service),
):
    """Hapus offer sponsorship masuk."""
    return apply_result(service.delete(offer_id, user), response)
