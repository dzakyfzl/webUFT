"""Sponsorship models.

Mengelola calon/sponsor aktif, PIC internal, contact person, proposal, dan offer.
Ref: PRD §3.4
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Sponsor(Base):
    __tablename__ = "hr_sponsor"

    id = Column(Integer, primary_key=True, index=True)
    nama_perusahaan = Column(String(255), nullable=False)
    pic_internal_id = Column(Integer, ForeignKey("akun.akunID"), nullable=True)  # siapa dari tim yang pegang

    # Contact Person pihak sponsor
    cp_nama = Column(String(255), nullable=True)
    cp_jabatan = Column(String(255), nullable=True)
    cp_wa = Column(String(50), nullable=True)
    cp_email = Column(String(255), nullable=True)

    status = Column(String(50), nullable=False, default="Prospek")
    # Statuses: Prospek, Proposal Terkirim, Nego, Deal, Ditolak

    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    proposals = relationship("SponsorProposal", back_populates="sponsor", cascade="all, delete-orphan",
                              order_by="SponsorProposal.tanggal_kirim.desc()")
    offers = relationship("SponsorOffer", back_populates="sponsor", cascade="all, delete-orphan")
    notes = relationship("SponsorNote", back_populates="sponsor", cascade="all, delete-orphan",
                          order_by="SponsorNote.created_at.desc()")

    # Offer Sponsorship Masuk can optionally link back
    offer_masuk = relationship("OfferSponsorshipMasuk", back_populates="sponsor")


class SponsorProposal(Base):
    """Riwayat pengiriman proposal ke sponsor."""
    __tablename__ = "hr_sponsor_proposal"

    id = Column(Integer, primary_key=True, index=True)
    sponsor_id = Column(Integer, ForeignKey("hr_sponsor.id", ondelete="CASCADE"), nullable=False)
    tanggal_kirim = Column(DateTime, nullable=False)
    versi = Column(String(100), nullable=True)  # versi proposal
    link_file = Column(Text, nullable=True)

    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    sponsor = relationship("Sponsor", back_populates="proposals")


class SponsorOffer(Base):
    """Tawaran/offer dari sponsor setelah proposal dikirim."""
    __tablename__ = "hr_sponsor_offer"

    id = Column(Integer, primary_key=True, index=True)
    sponsor_id = Column(Integer, ForeignKey("hr_sponsor.id", ondelete="CASCADE"), nullable=False)
    nilai = Column(String(255), nullable=True)  # nominal / value
    bentuk_kerjasama = Column(Text, nullable=True)
    syarat = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Pending")
    # Statuses: Pending, Negosiasi, Deal, Ditolak

    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    sponsor = relationship("Sponsor", back_populates="offers")


class SponsorNote(Base):
    __tablename__ = "hr_sponsor_note"

    id = Column(Integer, primary_key=True, index=True)
    sponsor_id = Column(Integer, ForeignKey("hr_sponsor.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    sponsor = relationship("Sponsor", back_populates="notes")
