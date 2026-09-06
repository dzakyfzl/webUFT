"""Program Kerja (Proker) models.

Proker memiliki sub-list medpart tamu undangan dan sponsor per proker.
Ref: PRD §3.7
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Proker(Base):
    __tablename__ = "hr_proker"

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String(255), nullable=False)
    deskripsi = Column(Text, nullable=True)

    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    medpart_assignments = relationship("ProkerMedpart", back_populates="proker", cascade="all, delete-orphan")
    sponsor_assignments = relationship("ProkerSponsor", back_populates="proker", cascade="all, delete-orphan")
    jadwal_posters = relationship("JadwalPoster", back_populates="proker")


class ProkerMedpart(Base):
    """Relasi M2M: Medpart tamu undangan per proker."""
    __tablename__ = "hr_proker_medpart"

    proker_id = Column(Integer, ForeignKey("hr_proker.id", ondelete="CASCADE"), primary_key=True)
    medpart_id = Column(Integer, ForeignKey("hr_medpart_masuk.id", ondelete="CASCADE"), primary_key=True)
    status_kehadiran = Column(String(50), nullable=True)  # status khusus per proker

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    proker = relationship("Proker", back_populates="medpart_assignments")
    medpart = relationship("MedpartMasuk")


class ProkerSponsor(Base):
    """Relasi M2M: Sponsor per proker."""
    __tablename__ = "hr_proker_sponsor"

    proker_id = Column(Integer, ForeignKey("hr_proker.id", ondelete="CASCADE"), primary_key=True)
    sponsor_id = Column(Integer, ForeignKey("hr_sponsor.id", ondelete="CASCADE"), primary_key=True)
    status = Column(String(50), nullable=True)  # status keterlibatan per proker

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    proker = relationship("Proker", back_populates="sponsor_assignments")
    sponsor = relationship("Sponsor")
