"""Router for Proker (Program Kerja)."""

from fastapi import APIRouter, Depends, Query

from app.core.access_guard import require_access
from app.schemas.hr.proker_undangan import (
    ProkerCreate,
    ProkerDetailResponse,
    ProkerMedpartCreate,
    ProkerMedpartResponse,
    ProkerResponse,
    ProkerSponsorCreate,
    ProkerSponsorResponse,
    ProkerUpdate,
)
from app.services.hr.dependencies import get_proker_service

router = APIRouter(prefix="/proker", tags=["HR - Proker"])


@router.get("/", response_model=dict)
def list_proker(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    svc=Depends(get_proker_service),
    user=Depends(require_access("Kelola Proker")),
):
    return svc.list_all(skip=skip, limit=limit)


@router.post("/", response_model=ProkerResponse, status_code=201)
def create_proker(
    data: ProkerCreate,
    svc=Depends(get_proker_service),
    user=Depends(require_access("Kelola Proker")),
):
    return svc.create(data, user["akunID"])


@router.get("/{proker_id}", response_model=ProkerDetailResponse)
def get_proker(
    proker_id: int,
    svc=Depends(get_proker_service),
    user=Depends(require_access("Kelola Proker")),
):
    return svc.get(proker_id)


@router.patch("/{proker_id}", response_model=ProkerResponse)
def update_proker(
    proker_id: int,
    data: ProkerUpdate,
    svc=Depends(get_proker_service),
    user=Depends(require_access("Kelola Proker")),
):
    return svc.update(proker_id, data)


@router.delete("/{proker_id}")
def delete_proker(
    proker_id: int,
    svc=Depends(get_proker_service),
    user=Depends(require_access("Kelola Proker")),
):
    return svc.delete(proker_id)


# ---- Pivot: Medpart ----

@router.post("/{proker_id}/medpart", response_model=ProkerMedpartResponse, status_code=201)
def add_medpart(
    proker_id: int,
    data: ProkerMedpartCreate,
    svc=Depends(get_proker_service),
    user=Depends(require_access("Kelola Proker")),
):
    return svc.add_medpart(proker_id, data)


@router.delete("/{proker_id}/medpart/{medpart_id}")
def remove_medpart(
    proker_id: int,
    medpart_id: int,
    svc=Depends(get_proker_service),
    user=Depends(require_access("Kelola Proker")),
):
    return svc.remove_medpart(proker_id, medpart_id)


# ---- Pivot: Sponsor ----

@router.post("/{proker_id}/sponsor", response_model=ProkerSponsorResponse, status_code=201)
def add_sponsor(
    proker_id: int,
    data: ProkerSponsorCreate,
    svc=Depends(get_proker_service),
    user=Depends(require_access("Kelola Proker")),
):
    return svc.add_sponsor(proker_id, data)


@router.delete("/{proker_id}/sponsor/{sponsor_id}")
def remove_sponsor(
    proker_id: int,
    sponsor_id: int,
    svc=Depends(get_proker_service),
    user=Depends(require_access("Kelola Proker")),
):
    return svc.remove_sponsor(proker_id, sponsor_id)
