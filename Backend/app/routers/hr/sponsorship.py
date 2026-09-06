"""Router for Sponsorship module.

All endpoints require 'Kelola Sponsorship' bidang access.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.core.access_guard import require_access
from app.routers.helpers import apply_result
from app.schemas.hr.sponsorship import (
    SponsorCreate,
    SponsorNoteCreate,
    SponsorOfferCreate,
    SponsorOfferUpdate,
    SponsorProposalCreate,
    SponsorUpdate,
)
from app.services.hr.dependencies import get_sponsorship_service
from app.services.hr.sponsorship_service import SponsorshipService

router = APIRouter(prefix="/sponsorship", tags=["HR - Sponsorship"])


@router.post("/")
def create_sponsor(
    data: SponsorCreate,
    response: Response,
    user: dict = Depends(require_access("Kelola Sponsorship")),
    service: SponsorshipService = Depends(get_sponsorship_service),
):
    """Tambah sponsor baru."""
    return apply_result(service.create(data, user), response)


@router.get("/")
def list_sponsors(
    response: Response,
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(require_access("Kelola Sponsorship")),
    service: SponsorshipService = Depends(get_sponsorship_service),
):
    """List sponsor dengan filter & pagination."""
    return apply_result(service.list(status=status, search=search, skip=skip, limit=limit), response)


@router.get("/{sponsor_id}")
def get_sponsor(
    sponsor_id: int,
    response: Response,
    user: dict = Depends(require_access("Kelola Sponsorship")),
    service: SponsorshipService = Depends(get_sponsorship_service),
):
    """Detail sponsor + proposals + offers + notes + audit log."""
    return apply_result(service.get(sponsor_id), response)


@router.patch("/{sponsor_id}")
def update_sponsor(
    sponsor_id: int,
    data: SponsorUpdate,
    response: Response,
    user: dict = Depends(require_access("Kelola Sponsorship")),
    service: SponsorshipService = Depends(get_sponsorship_service),
):
    """Update data/status sponsor."""
    return apply_result(service.update(sponsor_id, data, user), response)


@router.delete("/{sponsor_id}")
def delete_sponsor(
    sponsor_id: int,
    response: Response,
    user: dict = Depends(require_access("Kelola Sponsorship")),
    service: SponsorshipService = Depends(get_sponsorship_service),
):
    """Hapus sponsor."""
    return apply_result(service.delete(sponsor_id, user), response)


# --- Sub-record endpoints ---

@router.post("/{sponsor_id}/proposal")
def add_proposal(
    sponsor_id: int,
    data: SponsorProposalCreate,
    response: Response,
    user: dict = Depends(require_access("Kelola Sponsorship")),
    service: SponsorshipService = Depends(get_sponsorship_service),
):
    """Catat pengiriman proposal ke sponsor."""
    return apply_result(service.add_proposal(sponsor_id, data, user), response)


@router.post("/{sponsor_id}/offer")
def add_offer(
    sponsor_id: int,
    data: SponsorOfferCreate,
    response: Response,
    user: dict = Depends(require_access("Kelola Sponsorship")),
    service: SponsorshipService = Depends(get_sponsorship_service),
):
    """Catat offer/tawaran dari sponsor."""
    return apply_result(service.add_offer(sponsor_id, data, user), response)


@router.patch("/{sponsor_id}/offer/{offer_id}")
def update_offer(
    sponsor_id: int,
    offer_id: int,
    data: SponsorOfferUpdate,
    response: Response,
    user: dict = Depends(require_access("Kelola Sponsorship")),
    service: SponsorshipService = Depends(get_sponsorship_service),
):
    """Update status/detail offer sponsor."""
    return apply_result(service.update_offer(sponsor_id, offer_id, data, user), response)


@router.post("/{sponsor_id}/note")
def add_note(
    sponsor_id: int,
    data: SponsorNoteCreate,
    response: Response,
    user: dict = Depends(require_access("Kelola Sponsorship")),
    service: SponsorshipService = Depends(get_sponsorship_service),
):
    """Tambah catatan pada sponsor."""
    return apply_result(service.add_note(sponsor_id, data, user), response)
