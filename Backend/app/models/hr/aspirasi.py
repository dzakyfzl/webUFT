"""Aspirasi models.

Pengelolaan link form aspirasi & riwayat pengiriman bulanan.
Ref: PRD §3.11
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class AspirasiSettings(Base):
    """Singleton settings: link form & link grup WA aspirasi."""
    __tablename__ = "hr_aspirasi_settings"

    id = Column(Integer, primary_key=True, default=1)  # singleton, always id=1
    link_form = Column(Text, nullable=True)  # Google Form / link eksternal
    link_grup_wa = Column(Text, nullable=True)  # chat.whatsapp.com/<kode_invite>
    template_pesan = Column(Text, nullable=True)  # template pesan dengan placeholder

    updated_by = Column(Integer, ForeignKey("akun.akunID"), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class AspirasiRiwayat(Base):
    """Riwayat pengiriman aspirasi bulanan."""
    __tablename__ = "hr_aspirasi_riwayat"

    id = Column(Integer, primary_key=True, index=True)
    bulan = Column(Integer, nullable=False)  # 1-12
    tahun = Column(Integer, nullable=False)  # e.g. 2026
    dikirim_oleh = Column(Integer, ForeignKey("akun.akunID"), nullable=True)
    dikirim_pada = Column(DateTime, nullable=True)
    link_rekap = Column(Text, nullable=True)  # link hasil rekap respon

    status = Column(String(50), nullable=False, default="Belum Dikirim")
    # Statuses: Belum Dikirim, Terkirim, Overdue

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
