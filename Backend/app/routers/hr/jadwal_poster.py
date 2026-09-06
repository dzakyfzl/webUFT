"""Router for Jadwal Poster (Media Partner Posting Schedule).

All endpoints require 'Kelola Medpart Masuk' bidang access.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.core.access_guard import require_access
from app.routers.helpers import apply_result
from app.schemas.hr.supporting import JadwalPosterCreate, JadwalPosterUpdate
from app.services.hr.dependencies import get_jadwal_poster_service
from app.services.hr.jadwal_poster_service import JadwalPosterService

router = APIRouter(prefix="/jadwal-poster", tags=["HR - Jadwal Poster"])


@router.post(
    "/",
    dependencies=[Depends(require_access("Kelola Medpart Masuk"))],
)
def create_jadwal_poster(
    data: JadwalPosterCreate,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Masuk")),
    service: JadwalPosterService = Depends(get_jadwal_poster_service),
):
    """Buat jadwal poster baru untuk medpart."""
    return apply_result(service.create(data, user), response)


@router.get("/")
def list_jadwal_poster(
    response: Response,
    medpart_id: Optional[int] = Query(None),
    proker_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    overdue_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(require_access("Kelola Medpart Masuk")),
    service: JadwalPosterService = Depends(get_jadwal_poster_service),
):
    """List jadwal poster dengan filter medpart, proker, status, overdue."""
    return apply_result(
        service.list(
            medpart_id=medpart_id,
            proker_id=proker_id,
            status=status,
            overdue_only=overdue_only,
            skip=skip,
            limit=limit,
        ),
        response,
    )


@router.get("/{jadwal_id}")
def get_jadwal_poster(
    jadwal_id: int,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Masuk")),
    service: JadwalPosterService = Depends(get_jadwal_poster_service),
):
    """Detail jadwal poster (auto-update status Telat jika deadline terlewat)."""
    return apply_result(service.get(jadwal_id), response)


@router.patch("/{jadwal_id}")
def update_jadwal_poster(
    jadwal_id: int,
    data: JadwalPosterUpdate,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Masuk")),
    service: JadwalPosterService = Depends(get_jadwal_poster_service),
):
    """Update jadwal poster (status, link_bukti, tanggal_deadline, catatan)."""
    return apply_result(service.update(jadwal_id, data, user), response)


@router.delete("/{jadwal_id}")
def delete_jadwal_poster(
    jadwal_id: int,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Masuk")),
    service: JadwalPosterService = Depends(get_jadwal_poster_service),
):
    """Hapus jadwal poster."""
    return apply_result(service.delete(jadwal_id, user), response)
