"""Pydantic schemas for Medpart Sebar (Outbound)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# --- Request schemas ---

class MedpartSebarCreate(BaseModel):
    nama: str = Field(..., min_length=1, max_length=255)
    kontak_wa: Optional[str] = None
    pic: Optional[str] = None
    platform: Optional[str] = None
    bisa_bayar: bool = False
    nominal_bayar: Optional[str] = None
    minimal_follow: Optional[int] = None


class MedpartSebarUpdate(BaseModel):
    nama: Optional[str] = Field(None, min_length=1, max_length=255)
    kontak_wa: Optional[str] = None
    pic: Optional[str] = None
    platform: Optional[str] = None
    bisa_bayar: Optional[bool] = None
    nominal_bayar: Optional[str] = None
    minimal_follow: Optional[int] = None
    status: Optional[str] = None  # Belum Dihubungi, Dihubungi, Nego, Deal, Batal


class MedpartSebarNoteCreate(BaseModel):
    content: str = Field(..., min_length=1)


# --- Response schemas ---

class SebarNoteResponse(BaseModel):
    id: int
    content: str
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MedpartSebarResponse(BaseModel):
    id: int
    nama: str
    kontak_wa: Optional[str] = None
    pic: Optional[str] = None
    platform: Optional[str] = None
    bisa_bayar: bool
    nominal_bayar: Optional[str] = None
    minimal_follow: Optional[int] = None
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MedpartSebarDetailResponse(MedpartSebarResponse):
    notes: list[SebarNoteResponse] = []
