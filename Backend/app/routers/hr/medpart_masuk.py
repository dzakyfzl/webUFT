"""Router for Medpart Masuk (Inbound).

All endpoints require 'Kelola Medpart Masuk' bidang access.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.core.access_guard import require_access
from app.routers.helpers import apply_result
from app.schemas.hr.medpart_masuk import MedpartMasukCreate, MedpartMasukNoteCreate, MedpartMasukUpdate
from app.services.hr.dependencies import get_medpart_masuk_service
from app.services.hr.medpart_masuk_service import MedpartMasukService

router = APIRouter(prefix="/medpart-masuk", tags=["HR - Medpart Masuk"])


@router.post(
    "/",
    dependencies=[Depends(require_access("Kelola Medpart Masuk"))],
)
def create_medpart_masuk(
    data: MedpartMasukCreate,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Masuk")),
    service: MedpartMasukService = Depends(get_medpart_masuk_service),
):
    """Tambah medpart masuk baru."""
    return apply_result(service.create(data, user), response)


@router.get("/")
def list_medpart_masuk(
    response: Response,
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(require_access("Kelola Medpart Masuk")),
    service: MedpartMasukService = Depends(get_medpart_masuk_service),
):
    """List medpart masuk dengan filter & pagination."""
    return apply_result(service.list(status=status, search=search, skip=skip, limit=limit), response)


@router.get("/{medpart_id}")
def get_medpart_masuk(
    medpart_id: int,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Masuk")),
    service: MedpartMasukService = Depends(get_medpart_masuk_service),
):
    """Detail medpart masuk + notes + audit log."""
    return apply_result(service.get(medpart_id), response)


@router.patch("/{medpart_id}")
def update_medpart_masuk(
    medpart_id: int,
    data: MedpartMasukUpdate,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Masuk")),
    service: MedpartMasukService = Depends(get_medpart_masuk_service),
):
    """Update data/status medpart masuk."""
    return apply_result(service.update(medpart_id, data, user), response)


@router.delete("/{medpart_id}")
def delete_medpart_masuk(
    medpart_id: int,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Masuk")),
    service: MedpartMasukService = Depends(get_medpart_masuk_service),
):
    """Hapus medpart masuk."""
    return apply_result(service.delete(medpart_id, user), response)


@router.post("/{medpart_id}/note")
def add_medpart_masuk_note(
    medpart_id: int,
    data: MedpartMasukNoteCreate,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Masuk")),
    service: MedpartMasukService = Depends(get_medpart_masuk_service),
):
    """Tambah catatan pada medpart masuk."""
    return apply_result(service.add_note(medpart_id, data, user), response)
