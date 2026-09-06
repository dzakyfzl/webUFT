"""Service for Template Chat module."""

from typing import Optional

from fastapi import HTTPException, status

from app.repositories.hr.template_chat_repo import TemplateChatRepository
from app.schemas.hr.template_chat import (
    ResolvedTemplateResponse,
    TemplateChatCreate,
    TemplateChatResponse,
    TemplateChatUpdate,
)


class TemplateChatService:
    def __init__(self, repo: TemplateChatRepository):
        self.repo = repo

    def create(self, data: TemplateChatCreate, user_id: int) -> TemplateChatResponse:
        entity = self.repo.create(
            nama=data.nama,
            kategori=data.kategori,
            konten=data.konten,
            created_by=user_id,
        )
        return TemplateChatResponse.model_validate(entity)

    def list_all(self, kategori: Optional[str] = None, skip: int = 0, limit: int = 50) -> dict:
        items = self.repo.list_all(kategori=kategori, skip=skip, limit=limit)
        total = self.repo.count(kategori=kategori)
        return {
            "data": [TemplateChatResponse.model_validate(i) for i in items],
            "total": total,
        }

    def get(self, template_id: int) -> TemplateChatResponse:
        entity = self.repo.get_by_id(template_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template tidak ditemukan")
        return TemplateChatResponse.model_validate(entity)

    def update(self, template_id: int, data: TemplateChatUpdate) -> TemplateChatResponse:
        entity = self.repo.update(
            template_id,
            **{k: v for k, v in data.model_dump().items() if v is not None},
        )
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template tidak ditemukan")
        return TemplateChatResponse.model_validate(entity)

    def delete(self, template_id: int) -> dict:
        ok = self.repo.delete(template_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template tidak ditemukan")
        return {"message": "Template berhasil dihapus"}

    def resolve(
        self,
        template_id: int,
        context: dict,
        phone: Optional[str] = None,
    ) -> ResolvedTemplateResponse:
        """Resolve placeholder dan optionally generate wa.me URL."""
        entity = self.repo.get_by_id(template_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template tidak ditemukan")

        resolved, found, missing = TemplateChatRepository.resolve(entity.konten, context)

        # Build wa.me URL jika phone tersedia
        wa_url = ""
        if phone:
            try:
                wa_url = TemplateChatRepository.build_wa_url(phone, resolved)
            except Exception:
                wa_url = ""

        return ResolvedTemplateResponse(
            original=entity.konten,
            resolved=resolved,
            wa_url=wa_url,
            placeholders_found=found,
            placeholders_missing=missing,
        )
