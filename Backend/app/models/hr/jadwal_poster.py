"""Jadwal Poster (Media Partner) models.

Kalender jadwal upload poster per medpart per proker.
Ref: PRD §3.10
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class JadwalPoster(Base):
    __tablename__ = "hr_jadwal_poster"

    id = Column(Integer, primary_key=True, index=True)
    medpart_id = Column(Integer, ForeignKey("hr_medpart_masuk.id", ondelete="CASCADE"), nullable=False)
    proker_id = Column(Integer, ForeignKey("hr_proker.id", ondelete="SET NULL"), nullable=True)
    tanggal_deadline = Column(DateTime, nullable=False)
    catatan = Column(Text, nullable=True)
    link_bukti = Column(Text, nullable=True)  # link bukti upload

    status = Column(String(50), nullable=False, default="Belum Jadwal")
    # Statuses: Belum Jadwal, Terjadwal, Sudah Upload, Telat (Overdue)

    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    medpart = relationship("MedpartMasuk", back_populates="jadwal_posters")
    proker = relationship("Proker", back_populates="jadwal_posters")
