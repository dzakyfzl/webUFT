"""Repository for Template Chat."""

import re
from typing import Optional
from urllib.parse import quote

from sqlalchemy.orm import Session

from app.models.hr.template_chat import TemplateChat
from app.repositories.base import BaseRepository


class TemplateChatRepository(BaseRepository):

    def create(self, **kwargs) -> TemplateChat:
        entity = TemplateChat(**kwargs)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get_by_id(self, template_id: int) -> Optional[TemplateChat]:
        return self.db.query(TemplateChat).filter(TemplateChat.id == template_id).first()

    def list_all(
        self,
        kategori: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[TemplateChat]:
        query = self.db.query(TemplateChat)
        if kategori:
            query = query.filter(TemplateChat.kategori == kategori)
        return query.order_by(TemplateChat.nama.asc()).offset(skip).limit(limit).all()

    def count(self, kategori: Optional[str] = None) -> int:
        query = self.db.query(TemplateChat)
        if kategori:
            query = query.filter(TemplateChat.kategori == kategori)
        return query.count()

    def update(self, template_id: int, **kwargs) -> Optional[TemplateChat]:
        entity = self.db.query(TemplateChat).filter(TemplateChat.id == template_id).first()
        if entity is None:
            return None
        for key, value in kwargs.items():
            setattr(entity, key, value)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, template_id: int) -> bool:
        entity = self.db.query(TemplateChat).filter(TemplateChat.id == template_id).first()
        if entity is None:
            return False
        self.db.delete(entity)
        self.db.commit()
        return True

    # ---- Placeholder resolver ----

    @staticmethod
    def extract_placeholders(konten: str) -> list[str]:
        """Ekstrak semua placeholder {{nama}} dari konten template."""
        return list(dict.fromkeys(re.findall(r"\{\{(\w+)\}\}", konten)))

    @staticmethod
    def resolve(konten: str, context: dict) -> tuple[str, list[str], list[str]]:
        """
        Resolve placeholder dalam konten template.

        Returns:
            (resolved_text, placeholders_found, placeholders_missing)
        """
        found = TemplateChatRepository.extract_placeholders(konten)
        missing = [p for p in found if p not in context or not context[p]]
        resolved = konten
        for key, value in context.items():
            resolved = resolved.replace(f"{{{{{key}}}}}", str(value))
        return resolved, found, missing

    @staticmethod
    def build_wa_url(phone: str, text: str) -> str:
        """Buat wa.me URL dari nomor telepon dan teks pesan.

        Phone dapat berupa format 08xx atau +62xx.
        """
        # Normalisasi nomor: hapus karakter non-digit, ubah 08 → 628
        digits = re.sub(r"\D", "", phone)
        if digits.startswith("0"):
            digits = "62" + digits[1:]
        encoded = quote(text)
        return f"https://wa.me/{digits}?text={encoded}"
