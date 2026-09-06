"""Router for Template Chat & wa.me URL builder."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.access_guard import require_access
from app.schemas.hr.template_chat import (
    PlaceholderResolveRequest,
    ResolvedTemplateResponse,
    TemplateChatCreate,
    TemplateChatResponse,
    TemplateChatUpdate,
)
from app.services.hr.dependencies import get_template_chat_service

router = APIRouter(prefix="/template-chat", tags=["HR - Template Chat"])


@router.get("/", response_model=dict)
def list_templates(
    kategori: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc=Depends(get_template_chat_service),
    user=Depends(require_access("Kelola Template Chat")),
):
    return svc.list_all(kategori=kategori, skip=skip, limit=limit)


@router.post("/", response_model=TemplateChatResponse, status_code=201)
def create_template(
    data: TemplateChatCreate,
    svc=Depends(get_template_chat_service),
    user=Depends(require_access("Kelola Template Chat")),
):
    return svc.create(data, user["akunID"])


@router.get("/{template_id}", response_model=TemplateChatResponse)
def get_template(
    template_id: int,
    svc=Depends(get_template_chat_service),
    user=Depends(require_access("Kelola Template Chat")),
):
    return svc.get(template_id)


@router.patch("/{template_id}", response_model=TemplateChatResponse)
def update_template(
    template_id: int,
    data: TemplateChatUpdate,
    svc=Depends(get_template_chat_service),
    user=Depends(require_access("Kelola Template Chat")),
):
    return svc.update(template_id, data)


@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    svc=Depends(get_template_chat_service),
    user=Depends(require_access("Kelola Template Chat")),
):
    return svc.delete(template_id)


@router.post("/{template_id}/resolve", response_model=ResolvedTemplateResponse)
def resolve_template(
    template_id: int,
    data: PlaceholderResolveRequest,
    phone: Optional[str] = Query(None, description="Nomor WA tujuan untuk wa.me URL"),
    svc=Depends(get_template_chat_service),
    user=Depends(require_access("Kelola Template Chat")),
):
    """
    Resolve placeholder dalam template dan generate wa.me URL.

    Context contoh: {"nama": "UFT", "proker": "Festival Fotografi", "deadline": "7 Sept 2026"}
    """
    return svc.resolve(template_id, data.context, phone)
