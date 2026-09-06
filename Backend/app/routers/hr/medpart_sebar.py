"""Router for Medpart Sebar (Outbound).

All endpoints require 'Kelola Medpart Sebar' bidang access.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.core.access_guard import require_access
from app.routers.helpers import apply_result
from app.schemas.hr.medpart_sebar import MedpartSebarCreate, MedpartSebarNoteCreate, MedpartSebarUpdate
from app.services.hr.dependencies import get_medpart_sebar_service
from app.services.hr.medpart_sebar_service import MedpartSebarService

router = APIRouter(prefix="/medpart-sebar", tags=["HR - Medpart Sebar"])


@router.post(
    "/",
    dependencies=[Depends(require_access("Kelola Medpart Sebar"))],
)
def create_medpart_sebar(
    data: MedpartSebarCreate,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Sebar")),
    service: MedpartSebarService = Depends(get_medpart_sebar_service),
):
    """Tambah calon medpart sebar baru."""
    return apply_result(service.create(data, user), response)


@router.get("/")
def list_medpart_sebar(
    response: Response,
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(require_access("Kelola Medpart Sebar")),
    service: MedpartSebarService = Depends(get_medpart_sebar_service),
):
    """List calon medpart sebar dengan filter & pagination."""
    return apply_result(service.list(status=status, search=search, skip=skip, limit=limit), response)


@router.get("/{medpart_id}")
def get_medpart_sebar(
    medpart_id: int,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Sebar")),
    service: MedpartSebarService = Depends(get_medpart_sebar_service),
):
    """Detail medpart sebar + notes + audit log."""
    return apply_result(service.get(medpart_id), response)


@router.patch("/{medpart_id}")
def update_medpart_sebar(
    medpart_id: int,
    data: MedpartSebarUpdate,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Sebar")),
    service: MedpartSebarService = Depends(get_medpart_sebar_service),
):
    """Update data/status medpart sebar."""
    return apply_result(service.update(medpart_id, data, user), response)


@router.delete("/{medpart_id}")
def delete_medpart_sebar(
    medpart_id: int,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Sebar")),
    service: MedpartSebarService = Depends(get_medpart_sebar_service),
):
    """Hapus medpart sebar."""
    return apply_result(service.delete(medpart_id, user), response)


@router.post("/{medpart_id}/note")
def add_medpart_sebar_note(
    medpart_id: int,
    data: MedpartSebarNoteCreate,
    response: Response,
    user: dict = Depends(require_access("Kelola Medpart Sebar")),
    service: MedpartSebarService = Depends(get_medpart_sebar_service),
):
    """Tambah catatan pada medpart sebar."""
    return apply_result(service.add_note(medpart_id, data, user), response)
