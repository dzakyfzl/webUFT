"""Pydantic schemas for Offer Sponsorship Masuk & Offer Kerja Sama/Job."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# --- Offer Sponsorship Masuk ---

class OfferSponsorshipCreate(BaseModel):
    nama_sponsor: str = Field(..., min_length=1, max_length=255)
    nilai: Optional[str] = None
    bentuk_kerjasama: Optional[str] = None
    dokumen_link: Optional[str] = None
    syarat: Optional[str] = None
    note: Optional[str] = None
    sponsor_id: Optional[int] = None  # relasi opsional ke sponsor existing


class OfferSponsorshipUpdate(BaseModel):
    nama_sponsor: Optional[str] = Field(None, min_length=1, max_length=255)
    nilai: Optional[str] = None
    bentuk_kerjasama: Optional[str] = None
    dokumen_link: Optional[str] = None
    syarat: Optional[str] = None
    status: Optional[str] = None  # Pending, Negosiasi, Deal, Ditolak
    note: Optional[str] = None
    sponsor_id: Optional[int] = None


class OfferSponsorshipResponse(BaseModel):
    id: int
    nama_sponsor: str
    nilai: Optional[str] = None
    bentuk_kerjasama: Optional[str] = None
    dokumen_link: Optional[str] = None
    syarat: Optional[str] = None
    status: str
    note: Optional[str] = None
    sponsor_id: Optional[int] = None
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Offer Kerja Sama / Job Masuk ---

class OfferKerjasamaCreate(BaseModel):
    nama_pengaju: str = Field(..., min_length=1, max_length=255)
    kategori: Optional[str] = None  # Kolaborasi Konten, Job Freelance, etc.
    kontak_person: Optional[str] = None
    deskripsi: Optional[str] = None
    bukti_link: Optional[str] = None
    nilai: Optional[str] = None
    note: Optional[str] = None


class OfferKerjasamaUpdate(BaseModel):
    nama_pengaju: Optional[str] = Field(None, min_length=1, max_length=255)
    kategori: Optional[str] = None
    kontak_person: Optional[str] = None
    deskripsi: Optional[str] = None
    bukti_link: Optional[str] = None
    nilai: Optional[str] = None
    status: Optional[str] = None  # Pending, Negosiasi, Deal/Diterima, Ditolak
    note: Optional[str] = None


class OfferKerjasamaResponse(BaseModel):
    id: int
    nama_pengaju: str
    kategori: Optional[str] = None
    kontak_person: Optional[str] = None
    deskripsi: Optional[str] = None
    bukti_link: Optional[str] = None
    nilai: Optional[str] = None
    status: str
    note: Optional[str] = None
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
