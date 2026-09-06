"""Pydantic schemas for Template Chat module."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# --- Request schemas ---

class TemplateChatCreate(BaseModel):
    nama: str = Field(..., min_length=1, max_length=255)
    kategori: str = Field(..., pattern="^(medpart|sponsor|undangan|aspirasi|umum)$")
    konten: str = Field(..., min_length=1)


class TemplateChatUpdate(BaseModel):
    nama: Optional[str] = Field(None, min_length=1, max_length=255)
    kategori: Optional[str] = Field(None, pattern="^(medpart|sponsor|undangan|aspirasi|umum)$")
    konten: Optional[str] = None


class PlaceholderResolveRequest(BaseModel):
    """Request untuk resolve placeholder di konten template."""
    template_id: int
    context: dict  # Key-value placeholder: {"nama": "UFT", "proker": "Festival Fotografi", ...}


# --- Response schemas ---

class TemplateChatResponse(BaseModel):
    id: int
    nama: str
    kategori: str
    konten: str
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResolvedTemplateResponse(BaseModel):
    """Response setelah placeholder di-resolve."""
    original: str
    resolved: str
    wa_url: str  # wa.me URL siap pakai
    placeholders_found: list[str]
    placeholders_missing: list[str]
