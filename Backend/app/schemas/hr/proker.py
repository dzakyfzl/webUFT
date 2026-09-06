"""Pydantic schemas for Proker (Program Kerja)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProkerCreate(BaseModel):
    nama: str = Field(..., min_length=1, max_length=255)
    deskripsi: Optional[str] = None


class ProkerUpdate(BaseModel):
    nama: Optional[str] = Field(None, min_length=1, max_length=255)
    deskripsi: Optional[str] = None


class ProkerMedpartAssign(BaseModel):
    medpart_id: int
    status_kehadiran: Optional[str] = None


class ProkerSponsorAssign(BaseModel):
    sponsor_id: int
    status: Optional[str] = None


class ProkerMedpartResponse(BaseModel):
    proker_id: int
    medpart_id: int
    status_kehadiran: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProkerSponsorResponse(BaseModel):
    proker_id: int
    sponsor_id: int
    status: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProkerResponse(BaseModel):
    id: int
    nama: str
    deskripsi: Optional[str] = None
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProkerDetailResponse(ProkerResponse):
    medpart_assignments: list[ProkerMedpartResponse] = []
    sponsor_assignments: list[ProkerSponsorResponse] = []
