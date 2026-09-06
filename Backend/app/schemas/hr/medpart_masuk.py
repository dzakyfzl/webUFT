"""Pydantic schemas for Medpart Masuk (Inbound)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# --- Request schemas ---

class MedpartMasukCreate(BaseModel):
    nama: str = Field(..., min_length=1, max_length=255)
    platform: Optional[str] = None
    kontak: Optional[str] = None
    jumlah_followers: Optional[int] = None
    link_bukti: Optional[str] = None
    syarat: Optional[str] = None


class MedpartMasukUpdate(BaseModel):
    nama: Optional[str] = Field(None, min_length=1, max_length=255)
    platform: Optional[str] = None
    kontak: Optional[str] = None
    jumlah_followers: Optional[int] = None
    link_bukti: Optional[str] = None
    syarat: Optional[str] = None
    status: Optional[str] = None  # Pending, Approved, Rejected


class MedpartMasukNoteCreate(BaseModel):
    content: str = Field(..., min_length=1)


# --- Response schemas ---

class NoteResponse(BaseModel):
    id: int
    content: str
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MedpartMasukResponse(BaseModel):
    id: int
    nama: str
    platform: Optional[str] = None
    kontak: Optional[str] = None
    jumlah_followers: Optional[int] = None
    link_bukti: Optional[str] = None
    syarat: Optional[str] = None
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MedpartMasukDetailResponse(MedpartMasukResponse):
    notes: list[NoteResponse] = []
