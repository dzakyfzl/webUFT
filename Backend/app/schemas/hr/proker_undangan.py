"""Pydantic schemas for Proker, Undangan, Reminder, and Aspirasi modules."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# =============================================================
# Proker
# =============================================================

class ProkerCreate(BaseModel):
    nama: str = Field(..., min_length=1, max_length=255)
    deskripsi: Optional[str] = None


class ProkerUpdate(BaseModel):
    nama: Optional[str] = Field(None, min_length=1, max_length=255)
    deskripsi: Optional[str] = None


class ProkerMedpartCreate(BaseModel):
    medpart_id: int
    status_kehadiran: Optional[str] = None


class ProkerSponsorCreate(BaseModel):
    sponsor_id: int
    status: Optional[str] = None


class ProkerMedpartResponse(BaseModel):
    medpart_id: int
    status_kehadiran: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProkerSponsorResponse(BaseModel):
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


# =============================================================
# Undangan
# =============================================================

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


class UndanganAssignCreate(BaseModel):
    akun_id: int


class UndanganAssignResponse(BaseModel):
    id: int
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
    assignments: list[UndanganAssignResponse] = []


# =============================================================
# Reminder
# =============================================================

class ReminderCreate(BaseModel):
    jenis: str = Field(..., pattern="^(undangan|poster|aspirasi|manual)$")
    referensi_id: int
    judul: Optional[str] = None
    tanggal_deadline: datetime
    assigned_to: Optional[int] = None


class ReminderUpdate(BaseModel):
    status: Optional[str] = None   # Aktif, Selesai, Overdue
    judul: Optional[str] = None
    tanggal_deadline: Optional[datetime] = None
    assigned_to: Optional[int] = None


class ReminderResponse(BaseModel):
    id: int
    jenis: str
    referensi_id: int
    judul: Optional[str] = None
    tanggal_deadline: datetime
    status: str
    snoozed_until: Optional[datetime] = None
    assigned_to: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# =============================================================
# Aspirasi
# =============================================================

class AspirasiSettingsUpdate(BaseModel):
    link_form: Optional[str] = None
    link_grup_wa: Optional[str] = None
    template_pesan: Optional[str] = None


class AspirasiSettingsResponse(BaseModel):
    id: int
    link_form: Optional[str] = None
    link_grup_wa: Optional[str] = None
    template_pesan: Optional[str] = None
    updated_by: Optional[int] = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class AspirasiRiwayatResponse(BaseModel):
    id: int
    bulan: int
    tahun: int
    dikirim_oleh: Optional[int] = None
    dikirim_pada: Optional[datetime] = None
    link_rekap: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AspirasiMarkSentRequest(BaseModel):
    link_rekap: Optional[str] = None
