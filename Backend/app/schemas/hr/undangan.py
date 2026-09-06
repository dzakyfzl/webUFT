"""Pydantic schemas for Undangan & Assign Kehadiran."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UndanganCreate(BaseModel):
    nama_acara: str = Field(..., min_length=1, max_length=255)
    pengundang: Optional[str] = None
    tanggal: Optional[datetime] = None
    lokasi: Optional[str] = None
    deadline_konfirmasi: Optional[datetime] = None


class UndanganUpdate(BaseModel):
    nama_acara: Optional[str] = Field(None, min_length=1, max_length=255)
    pengundang: Optional[str] = None
    tanggal: Optional[datetime] = None
    lokasi: Optional[str] = None
    deadline_konfirmasi: Optional[datetime] = None
    status: Optional[str] = None  # Baru, Dikonfirmasi, Ditolak, Selesai


class AssignmentCreate(BaseModel):
    akun_ids: list[int] = Field(..., min_length=1)


class AssignmentUpdateStatus(BaseModel):
    status_kehadiran: str  # Ditugaskan, Hadir, Tidak Hadir


class AssignmentResponse(BaseModel):
    id: int
    undangan_id: int
    akun_id: int
    status_kehadiran: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UndanganResponse(BaseModel):
    id: int
    nama_acara: str
    pengundang: Optional[str] = None
    tanggal: Optional[datetime] = None
    lokasi: Optional[str] = None
    deadline_konfirmasi: Optional[datetime] = None
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UndanganDetailResponse(UndanganResponse):
    assignments: list[AssignmentResponse] = []
