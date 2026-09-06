"""Router for Undangan (Invitation Management)."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.access_guard import require_access
from pydantic import BaseModel
from app.schemas.hr.proker_undangan import (
    UndanganAssignCreate,
    UndanganAssignResponse,
    UndanganCreate,
    UndanganDetailResponse,
    UndanganResponse,
    UndanganUpdate,
)
from app.services.hr.dependencies import get_undangan_service


class KehadiranUpdate(BaseModel):
    status_kehadiran: str  # Ditugaskan, Hadir, Tidak Hadir


router = APIRouter(prefix="/undangan", tags=["HR - Undangan"])




@router.get("/", response_model=dict)
def list_undangan(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    svc=Depends(get_undangan_service),
    user=Depends(require_access("Kelola Undangan")),
):
    return svc.list_all(status=status, skip=skip, limit=limit)


@router.post("/", response_model=UndanganResponse, status_code=201)
def create_undangan(
    data: UndanganCreate,
    svc=Depends(get_undangan_service),
    user=Depends(require_access("Kelola Undangan")),
):
    return svc.create(data, user["akunID"])


@router.get("/{undangan_id}", response_model=UndanganDetailResponse)
def get_undangan(
    undangan_id: int,
    svc=Depends(get_undangan_service),
    user=Depends(require_access("Kelola Undangan")),
):
    return svc.get(undangan_id)


@router.patch("/{undangan_id}", response_model=UndanganResponse)
def update_undangan(
    undangan_id: int,
    data: UndanganUpdate,
    svc=Depends(get_undangan_service),
    user=Depends(require_access("Kelola Undangan")),
):
    return svc.update(undangan_id, data)


@router.delete("/{undangan_id}")
def delete_undangan(
    undangan_id: int,
    svc=Depends(get_undangan_service),
    user=Depends(require_access("Kelola Undangan")),
):
    return svc.delete(undangan_id)


# ---- Assignments ----

@router.post("/{undangan_id}/assign", response_model=UndanganAssignResponse, status_code=201)
def assign(
    undangan_id: int,
    data: UndanganAssignCreate,
    svc=Depends(get_undangan_service),
    user=Depends(require_access("Kelola Undangan")),
):
    return svc.assign(undangan_id, data)


@router.delete("/{undangan_id}/assign/{akun_id}")
def unassign(
    undangan_id: int,
    akun_id: int,
    svc=Depends(get_undangan_service),
    user=Depends(require_access("Kelola Undangan")),
):
    return svc.unassign(undangan_id, akun_id)


@router.patch("/{undangan_id}/assign/{akun_id}/kehadiran", response_model=UndanganAssignResponse)
def update_kehadiran(
    undangan_id: int,
    akun_id: int,
    data: "KehadiranUpdate",
    svc=Depends(get_undangan_service),
    user=Depends(require_access("Kelola Undangan")),
):
    return svc.update_kehadiran(undangan_id, akun_id, data.status_kehadiran)
