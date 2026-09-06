"""Media Partner Masuk (Inbound) models.

Medpart yang mengajukan diri / follow ke organisasi.
Ref: PRD §3.2
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class MedpartMasuk(Base):
    __tablename__ = "hr_medpart_masuk"

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String(255), nullable=False)
    platform = Column(String(100))  # Instagram, Twitter, TikTok, etc.
    kontak = Column(String(255))  # nomor WA / email
    jumlah_followers = Column(Integer, nullable=True)
    link_bukti = Column(Text, nullable=True)  # link bukti follow
    syarat = Column(Text, nullable=True)  # rich text — syarat detail
    status = Column(String(50), nullable=False, default="Pending")  # Pending, Approved, Rejected

    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    notes = relationship("MedpartMasukNote", back_populates="medpart", cascade="all, delete-orphan",
                          order_by="MedpartMasukNote.created_at.desc()")
    jadwal_posters = relationship("JadwalPoster", back_populates="medpart", cascade="all, delete-orphan")


class MedpartMasukNote(Base):
    __tablename__ = "hr_medpart_masuk_note"

    id = Column(Integer, primary_key=True, index=True)
    medpart_id = Column(Integer, ForeignKey("hr_medpart_masuk.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    medpart = relationship("MedpartMasuk", back_populates="notes")
