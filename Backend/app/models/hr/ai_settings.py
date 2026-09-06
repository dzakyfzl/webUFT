"""AI Integration Settings models.

Gemini API Key Pool & Model Selection.
Ref: PRD §3.12 (bagian Pengelolaan API Key & Pemilihan Model)
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class GeminiApiKey(Base):
    """Pool of Gemini API keys — round-robin with automatic failover."""
    __tablename__ = "hr_gemini_api_key"

    id = Column(Integer, primary_key=True, index=True)
    key_encrypted = Column(Text, nullable=False)  # API key (encrypted at rest)
    label = Column(String(255), nullable=True)  # opsional, untuk identifikasi
    urutan_prioritas = Column(Integer, nullable=False, default=0)  # lower = higher priority
    is_active = Column(Boolean, default=True)

    status = Column(String(50), nullable=False, default="Aktif")
    # Statuses: Aktif, Error, Quota Habis

    last_error_at = Column(DateTime, nullable=True)
    last_error_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class GeminiModelSetting(Base):
    """Singleton: model Gemini aktif yang dipakai sistem."""
    __tablename__ = "hr_gemini_model_setting"

    id = Column(Integer, primary_key=True, default=1)  # singleton
    model_name = Column(String(255), nullable=False, default="gemini-2.0-flash")
    # Available: gemini-2.0-flash-lite, gemini-2.0-flash, gemini-2.5-flash, gemini-2.5-flash-lite

    updated_by = Column(Integer, ForeignKey("akun.akunID"), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
