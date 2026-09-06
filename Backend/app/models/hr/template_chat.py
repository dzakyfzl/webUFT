"""Template Chat models.

CRUD template chat untuk WhatsApp, dikelompokkan: Template Medpart & Template Sponsor.
Ref: PRD §3.6
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class TemplateChat(Base):
    __tablename__ = "hr_template_chat"

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String(255), nullable=False)
    kategori = Column(String(50), nullable=False)
    # Kategori: medpart, sponsor

    konten = Column(Text, nullable=False)
    # Konten berisi placeholder: {{nama}}, {{nama_pic}}, {{nama_medpart}},
    # {{proker}}, {{deadline}}, {{link_form}}, dll.

    created_by = Column(Integer, ForeignKey("akun.akunID"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
