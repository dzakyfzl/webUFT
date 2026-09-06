"""Offer Masuk models — Sponsorship & Kerja Sama/Job.

Modul sensitif, hanya bisa diakses oleh Kadiv/Wakadiv/Super Admin.
Ref: PRD §3.5 & §3.5b
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class OfferSponsorshipMasuk(Base):
    """Tawaran sponsorship masuk (hasil kirim proposal / sponsor datang sendiri).
    Ref: PRD §3.5
    """
    __tablename__ = "hr_offer_sponsorship_masuk"

    id = Column(Integer, primary_key=True, index=True)
    nama_sponsor = Column(String(255), nullable=False)
    nilai = Column(String(255), nullable=True)
    bentuk_kerjasama = Column(Text, nullable=True)
    dokumen_link = Column(Text, nullable=True)
    syarat = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Pending")
    # Statuses: Pending, Negosiasi, Deal, Ditolak
    note = Column(Text, nullable=True)

    # Opsional: relasi ke sponsor existing
    sponsor_id = Column(Integer, ForeignKey("hr_sponsor.id", ondelete="SET NULL"), nullable=True)

    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    sponsor = relationship("Sponsor", back_populates="offer_masuk")


class OfferKerjasamaJob(Base):
    """Tawaran kerja sama / job non-sponsorship.
    Ref: PRD §3.5b
    """
    __tablename__ = "hr_offer_kerjasama_job"

    id = Column(Integer, primary_key=True, index=True)
    nama_pengaju = Column(String(255), nullable=False)
    kategori = Column(String(255), nullable=True)  # Kolaborasi Konten, Job Freelance, etc.
    kontak_person = Column(String(255), nullable=True)
    deskripsi = Column(Text, nullable=True)  # rich text detail tawaran
    bukti_link = Column(Text, nullable=True)
    nilai = Column(String(255), nullable=True)  # kompensasi (opsional)
    status = Column(String(50), nullable=False, default="Pending")
    # Statuses: Pending, Negosiasi, Deal/Diterima, Ditolak
    note = Column(Text, nullable=True)

    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
