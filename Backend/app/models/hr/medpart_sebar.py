"""Media Partner Sebar (Outbound) models.

Calon medpart yang kita hubungi untuk diajak kerja sama.
Ref: PRD §3.3
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class MedpartSebar(Base):
    __tablename__ = "hr_medpart_sebar"

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String(255), nullable=False)
    kontak_wa = Column(String(50))
    pic = Column(String(255))  # kontak person / PIC
    platform = Column(String(100))

    # Section syarat
    bisa_bayar = Column(Boolean, default=False)
    nominal_bayar = Column(String(255), nullable=True)  # nominal / skema jika bayar
    minimal_follow = Column(Integer, nullable=True)  # jumlah minimal follow jika tidak bayar

    status = Column(String(50), nullable=False, default="Belum Dihubungi")
    # Statuses: Belum Dihubungi, Dihubungi, Nego, Deal, Batal

    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    notes = relationship("MedpartSebarNote", back_populates="medpart_sebar", cascade="all, delete-orphan",
                          order_by="MedpartSebarNote.created_at.desc()")


class MedpartSebarNote(Base):
    __tablename__ = "hr_medpart_sebar_note"

    id = Column(Integer, primary_key=True, index=True)
    medpart_sebar_id = Column(Integer, ForeignKey("hr_medpart_sebar.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    medpart_sebar = relationship("MedpartSebar", back_populates="notes")
