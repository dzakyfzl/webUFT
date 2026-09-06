"""Reminder / Deadline models.

Reminder otomatis dari 3 sumber: Undangan, Jadwal Poster, Aspirasi.
Ref: PRD §3.9
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class Reminder(Base):
    __tablename__ = "hr_reminder"

    id = Column(Integer, primary_key=True, index=True)
    jenis = Column(String(50), nullable=False)
    # Jenis: undangan, poster, aspirasi

    referensi_id = Column(Integer, nullable=False)
    # ID dari record asal (undangan.id, jadwal_poster.id, aspirasi_riwayat.id)

    judul = Column(String(500), nullable=True)  # deskripsi singkat reminder
    tanggal_deadline = Column(DateTime, nullable=False)

    status = Column(String(50), nullable=False, default="Aktif")
    # Statuses: Aktif, Selesai, Snoozed, Overdue

    snoozed_until = Column(DateTime, nullable=True)  # jika di-snooze

    assigned_to = Column(Integer, ForeignKey("akun.akunID"), nullable=True)  # user terkait

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
