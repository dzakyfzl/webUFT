"""Audit Log models.

Pencatatan aktivitas per-record dan global.
Ref: PRD §3.13
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "hr_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    modul = Column(String(100), nullable=False)
    # Modul: medpart_masuk, medpart_sebar, sponsor, offer_sponsorship,
    # offer_kerjasama, undangan, proker, jadwal_poster, aspirasi,
    # template_chat, ai_settings, user_management

    record_id = Column(Integer, nullable=False)  # ID record di modul terkait

    aksi = Column(String(100), nullable=False)
    # Aksi: created, updated, status_changed, note_added, deleted,
    # assignment_changed, approval_changed

    user_id = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    user_nama = Column(String(255), nullable=False)  # snapshot nama (tetap ada jika akun dihapus)

    # Detail perubahan (hanya untuk field kunci: status, note, assignment, approval)
    field_key = Column(String(100), nullable=True)  # e.g. "status", "note", "pic_internal"
    nilai_lama = Column(Text, nullable=True)
    nilai_baru = Column(Text, nullable=True)

    via_ai = Column(Boolean, default=False)  # True jika dibuat via AI Assistant

    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)
