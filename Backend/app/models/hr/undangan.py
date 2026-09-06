"""Undangan & Assign Kehadiran models.

Ref: PRD §3.8
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Undangan(Base):
    __tablename__ = "hr_undangan"

    id = Column(Integer, primary_key=True, index=True)
    nama_acara = Column(String(255), nullable=False)
    pengundang = Column(String(255), nullable=True)
    tanggal = Column(DateTime, nullable=True)
    lokasi = Column(String(500), nullable=True)
    deadline_konfirmasi = Column(DateTime, nullable=True)
    status = Column(String(50), nullable=False, default="Baru")
    # Statuses: Baru, Dikonfirmasi, Ditolak, Selesai

    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    assignments = relationship("UndanganAssignment", back_populates="undangan", cascade="all, delete-orphan")


class UndanganAssignment(Base):
    """Multi-user assignment: siapa saja yang akan hadir."""
    __tablename__ = "hr_undangan_assignment"

    id = Column(Integer, primary_key=True, index=True)
    undangan_id = Column(Integer, ForeignKey("hr_undangan.id", ondelete="CASCADE"), nullable=False)
    akun_id = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    status_kehadiran = Column(String(50), nullable=True, default="Ditugaskan")
    # Statuses: Ditugaskan, Hadir, Tidak Hadir

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    undangan = relationship("Undangan", back_populates="assignments")
