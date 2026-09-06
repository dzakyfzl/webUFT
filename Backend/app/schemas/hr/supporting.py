"""Pydantic schemas for Jadwal Poster, Aspirasi, and Reminder."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# --- Jadwal Poster ---

class JadwalPosterCreate(BaseModel):
    medpart_id: int
    proker_id: Optional[int] = None
    tanggal_deadline: datetime
    catatan: Optional[str] = None


class JadwalPosterUpdate(BaseModel):
    tanggal_deadline: Optional[datetime] = None
    catatan: Optional[str] = None
    link_bukti: Optional[str] = None
    status: Optional[str] = None  # Belum Jadwal, Terjadwal, Sudah Upload, Telat


class JadwalPosterResponse(BaseModel):
    id: int
    medpart_id: int
    proker_id: Optional[int] = None
    tanggal_deadline: datetime
    catatan: Optional[str] = None
    link_bukti: Optional[str] = None
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Aspirasi ---

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


class AspirasiMarkSent(BaseModel):
    link_rekap: Optional[str] = None


# --- Reminder ---

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


class ReminderUpdateStatus(BaseModel):
    status: str  # Selesai, Snoozed


class ReminderSnooze(BaseModel):
    snoozed_until: datetime
