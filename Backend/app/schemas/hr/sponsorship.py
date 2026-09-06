"""Pydantic schemas for Sponsorship module."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# --- Request schemas ---

class SponsorCreate(BaseModel):
    nama_perusahaan: str = Field(..., min_length=1, max_length=255)
    pic_internal_id: Optional[int] = None
    cp_nama: Optional[str] = None
    cp_jabatan: Optional[str] = None
    cp_wa: Optional[str] = None
    cp_email: Optional[str] = None


class SponsorUpdate(BaseModel):
    nama_perusahaan: Optional[str] = Field(None, min_length=1, max_length=255)
    pic_internal_id: Optional[int] = None
    cp_nama: Optional[str] = None
    cp_jabatan: Optional[str] = None
    cp_wa: Optional[str] = None
    cp_email: Optional[str] = None
    status: Optional[str] = None  # Prospek, Proposal Terkirim, Nego, Deal, Ditolak


class SponsorProposalCreate(BaseModel):
    tanggal_kirim: datetime
    versi: Optional[str] = None
    link_file: Optional[str] = None


class SponsorOfferCreate(BaseModel):
    nilai: Optional[str] = None
    bentuk_kerjasama: Optional[str] = None
    syarat: Optional[str] = None
    status: str = "Pending"  # Pending, Negosiasi, Deal, Ditolak


class SponsorOfferUpdate(BaseModel):
    nilai: Optional[str] = None
    bentuk_kerjasama: Optional[str] = None
    syarat: Optional[str] = None
    status: Optional[str] = None


class SponsorNoteCreate(BaseModel):
    content: str = Field(..., min_length=1)


# --- Response schemas ---

class SponsorProposalResponse(BaseModel):
    id: int
    tanggal_kirim: datetime
    versi: Optional[str] = None
    link_file: Optional[str] = None
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SponsorOfferResponse(BaseModel):
    id: int
    nilai: Optional[str] = None
    bentuk_kerjasama: Optional[str] = None
    syarat: Optional[str] = None
    status: str
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SponsorNoteResponse(BaseModel):
    id: int
    content: str
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SponsorResponse(BaseModel):
    id: int
    nama_perusahaan: str
    pic_internal_id: Optional[int] = None
    cp_nama: Optional[str] = None
    cp_jabatan: Optional[str] = None
    cp_wa: Optional[str] = None
    cp_email: Optional[str] = None
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SponsorDetailResponse(SponsorResponse):
    proposals: list[SponsorProposalResponse] = []
    offers: list[SponsorOfferResponse] = []
    notes: list[SponsorNoteResponse] = []
