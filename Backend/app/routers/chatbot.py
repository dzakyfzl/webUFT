"""Router chatbot Angie.

Public:
  POST /chatbot/chat — user kirim pesan, terima jawaban Angie

Admin only (require valid JWT):
  GET/POST/PUT/DELETE /chatbot/knowledge  — kelola knowledge base
  GET/POST           /chatbot/unanswered — lihat & resolve pertanyaan tak terjawab
  GET/POST/DELETE/PATCH /chatbot/api-keys — kelola API key pool
  GET                /chatbot/stats       — dashboard statistik
  POST               /chatbot/knowledge/seed — seed bulk konteks
"""
import os
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.encryption import KeyEncryption
from app.core.security import validate_token
from app.models.entities import ChatbotApiKey
from app.repositories.chatbot_repository import ChatbotRepository
from app.schemas.chatbot import (
    ApiKeyCreate,
    ApiKeyResponse,
    ChatbotStats,
    ChatRequest,
    ChatResponse,
    KnowledgeCreate,
    KnowledgeResponse,
    KnowledgeUpdate,
    SeedRequest,
    SeedResponse,
    SoulResponse,
    SoulUpdate,
    UnansweredResolve,
    UnansweredResponse,
)
from app.services.api_key_pool import ApiKeyPool
from app.services.chatbot_service import ChatbotService
from app.utils.rate_limiter import chat_rate_limiter

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


def _get_encryption() -> KeyEncryption:
    master_key = os.getenv("CHATBOT_MASTER_KEY", "")
    if len(master_key) != 64:
        raise HTTPException(status_code=500, detail="CHATBOT_MASTER_KEY tidak dikonfigurasi dengan benar")
    return KeyEncryption(master_key)


def _get_chatbot_service(db: Session = Depends(get_db)) -> ChatbotService:
    return ChatbotService(db)


def _get_pool(db: Session = Depends(get_db)) -> ApiKeyPool:
    enc = _get_encryption()
    return ApiKeyPool(db, enc)


def _get_repo(db: Session = Depends(get_db)) -> ChatbotRepository:
    return ChatbotRepository(db)


# ─── PUBLIC ──────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    request: Request,
    service: ChatbotService = Depends(_get_chatbot_service),
):
    """Kirim pesan ke Angie. Endpoint ini terbuka untuk publik."""
    # Rate limit per IP — 10 request per menit
    client_ip = request.client.host if request.client else "unknown"
    if not chat_rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Terlalu banyak permintaan. Tunggu sebentar sebelum bertanya lagi ya! 😅",
        )

    # Sanitasi ringan: strip whitespace berlebih
    message = " ".join(payload.message.split())
    if not message:
        raise HTTPException(status_code=422, detail="Pesan tidak boleh kosong")

    user_ip = client_ip
    return service.chat(
        message=message,
        session_id=payload.session_id,
        user_ip=user_ip,
    )


# ─── ADMIN: Knowledge Base ────────────────────────────────────────────────────

@router.get("/knowledge", response_model=dict)
def list_knowledge(
    _: Annotated[str, Depends(validate_token)],
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    repo: ChatbotRepository = Depends(_get_repo),
):
    items, total = repo.list_knowledge(category=category, search=search, page=page, limit=limit)
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [KnowledgeResponse.model_validate(i) for i in items],
    }


@router.post("/knowledge", response_model=KnowledgeResponse, status_code=201)
def add_knowledge(
    payload: KnowledgeCreate,
    _: Annotated[str, Depends(validate_token)],
    service: ChatbotService = Depends(_get_chatbot_service),
    repo: ChatbotRepository = Depends(_get_repo),
):
    # Validasi konsistensi field sesuai content_type
    try:
        payload.validate_required_fields()
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        embedding = service.generate_embedding_for_knowledge(
            content_type=payload.content_type,
            question=payload.question,
            answer=payload.answer,
            content=payload.content,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    record = repo.add_knowledge(
        category=payload.category,
        embedding=embedding,
        content_type=payload.content_type,
        question=payload.question,
        answer=payload.answer,
        content=payload.content,
    )
    return KnowledgeResponse.model_validate(record)


@router.put("/knowledge/{knowledge_id}", response_model=KnowledgeResponse)
def update_knowledge(
    knowledge_id: int,
    payload: KnowledgeUpdate,
    _: Annotated[str, Depends(validate_token)],
    service: ChatbotService = Depends(_get_chatbot_service),
    repo: ChatbotRepository = Depends(_get_repo),
):
    existing = repo.get_knowledge(knowledge_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Knowledge tidak ditemukan")

    # Tentukan content_type akhir (pakai existing jika tidak diubah)
    new_content_type = payload.content_type or existing.content_type or "qa"

    # Re-embed jika ada field konten yang berubah
    new_embedding = None
    content_changed = any([
        payload.question is not None,
        payload.answer is not None,
        payload.content is not None,
        payload.content_type is not None,
    ])
    if content_changed:
        # Gunakan nilai baru jika ada, fallback ke existing
        q = payload.question if payload.question is not None else existing.question
        a = payload.answer if payload.answer is not None else existing.answer
        c = payload.content if payload.content is not None else existing.content
        try:
            new_embedding = service.generate_embedding_for_knowledge(
                content_type=new_content_type,
                question=q,
                answer=a,
                content=c,
            )
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e))

    record = repo.update_knowledge(
        knowledge_id,
        data=payload.model_dump(exclude_none=True),
        embedding=new_embedding,
    )
    return KnowledgeResponse.model_validate(record)


@router.delete("/knowledge/{knowledge_id}", status_code=204)
def delete_knowledge(
    knowledge_id: int,
    _: Annotated[str, Depends(validate_token)],
    repo: ChatbotRepository = Depends(_get_repo),
):
    if not repo.delete_knowledge(knowledge_id):
        raise HTTPException(status_code=404, detail="Knowledge tidak ditemukan")


@router.post("/knowledge/seed", response_model=SeedResponse)
def seed_knowledge(
    payload: SeedRequest,
    _: Annotated[str, Depends(validate_token)],
    service: ChatbotService = Depends(_get_chatbot_service),
    repo: ChatbotRepository = Depends(_get_repo),
):
    """Seed bulk konteks ke knowledge base. Tiap entry akan di-embed."""
    inserted = 0
    skipped = 0
    for entry in payload.entries:
        try:
            embedding = service.generate_embedding_for_knowledge(
                content_type=entry.content_type,
                question=entry.question,
                answer=entry.answer,
                content=entry.content,
            )
            repo.add_knowledge(
                category=entry.category,
                embedding=embedding,
                content_type=entry.content_type,
                question=entry.question,
                answer=entry.answer,
                content=entry.content,
            )
            inserted += 1
        except Exception:
            skipped += 1

    return SeedResponse(
        inserted=inserted,
        skipped=skipped,
        message=f"Seed selesai: {inserted} berhasil, {skipped} gagal.",
    )


# ─── ADMIN: Unanswered Questions ──────────────────────────────────────────────

@router.get("/unanswered", response_model=dict)
def list_unanswered(
    _: Annotated[str, Depends(validate_token)],
    is_resolved: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    repo: ChatbotRepository = Depends(_get_repo),
):
    items, total = repo.list_unanswered(is_resolved=is_resolved, page=page, limit=limit)
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [UnansweredResponse.model_validate(i) for i in items],
    }


@router.post("/unanswered/{unanswered_id}/resolve", response_model=KnowledgeResponse)
def resolve_unanswered(
    unanswered_id: int,
    payload: UnansweredResolve,
    _: Annotated[str, Depends(validate_token)],
    service: ChatbotService = Depends(_get_chatbot_service),
    repo: ChatbotRepository = Depends(_get_repo),
):
    """Jawab pertanyaan yang belum terjawab → simpan ke knowledge base sebagai Q&A.

    Setelah disimpan, embedding yang benar (RETRIEVAL_DOCUMENT) akan dibuat
    sehingga pertanyaan ini langsung bisa ditemukan di RAG pada request berikutnya.
    """
    from app.models.entities import ChatbotUnanswered
    db_session = service.db
    record = db_session.get(ChatbotUnanswered, unanswered_id)
    if not record:
        raise HTTPException(status_code=404, detail="Pertanyaan tidak ditemukan")

    try:
        embedding = service.generate_embedding_for_knowledge(
            content_type="qa",
            question=record.question,
            answer=payload.answer,
            content=None,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    knowledge = repo.add_knowledge(
        category=payload.category,
        embedding=embedding,
        content_type="qa",
        question=record.question,
        answer=payload.answer,
        content=None,
    )
    repo.resolve_unanswered(unanswered_id, knowledge.id)
    return KnowledgeResponse.model_validate(knowledge)


# ─── ADMIN: API Key Pool ─────────────────────────────────────────────────────

@router.get("/api-keys", response_model=list[ApiKeyResponse])
def list_api_keys(
    _: Annotated[str, Depends(validate_token)],
    pool: ApiKeyPool = Depends(_get_pool),
):
    """List semua API key — hanya preview yang ditampilkan, key asli tidak pernah dikirim."""
    return [ApiKeyResponse.model_validate(k) for k in pool.list_keys()]


@router.post("/api-keys", response_model=ApiKeyResponse, status_code=201)
def add_api_key(
    payload: ApiKeyCreate,
    _: Annotated[str, Depends(validate_token)],
    pool: ApiKeyPool = Depends(_get_pool),
):
    record = pool.add_key(
        api_key=payload.api_key,
        label=payload.label,
        priority=payload.priority,
    )
    return ApiKeyResponse.model_validate(record)


@router.delete("/api-keys/{key_id}", status_code=204)
def delete_api_key(
    key_id: int,
    _: Annotated[str, Depends(validate_token)],
    pool: ApiKeyPool = Depends(_get_pool),
):
    if not pool.remove_key(key_id):
        raise HTTPException(status_code=404, detail="API key tidak ditemukan")


@router.patch("/api-keys/{key_id}/toggle", response_model=ApiKeyResponse)
def toggle_api_key(
    key_id: int,
    _: Annotated[str, Depends(validate_token)],
    pool: ApiKeyPool = Depends(_get_pool),
):
    record = pool.toggle_key(key_id)
    if not record:
        raise HTTPException(status_code=404, detail="API key tidak ditemukan")
    return ApiKeyResponse.model_validate(record)


@router.post("/api-keys/{key_id}/reset", response_model=ApiKeyResponse)
def reset_api_key(
    key_id: int,
    _: Annotated[str, Depends(validate_token)],
    pool: ApiKeyPool = Depends(_get_pool),
):
    record = pool.reset_key(key_id)
    if not record:
        raise HTTPException(status_code=404, detail="API key tidak ditemukan")
    return ApiKeyResponse.model_validate(record)


# ─── ADMIN: Stats ─────────────────────────────────────────────────────────────

@router.get("/stats", response_model=ChatbotStats)
def get_stats(
    _: Annotated[str, Depends(validate_token)],
    service: ChatbotService = Depends(_get_chatbot_service),
):
    return service.get_stats()


@router.patch("/stats/toggle", response_model=dict)
def toggle_chatbot(
    _: Annotated[str, Depends(validate_token)],
    repo: ChatbotRepository = Depends(_get_repo),
):
    """Kill switch — aktifkan/nonaktifkan Angie."""
    config = repo.get_token_usage()
    repo.set_chatbot_active(not config.is_active)
    return {"is_active": not config.is_active}


# ─── ADMIN: Soul ─────────────────────────────────────────────────────────────────────

@router.get("/soul", response_model=SoulResponse)
def get_soul(
    _: Annotated[str, Depends(validate_token)],
    repo: ChatbotRepository = Depends(_get_repo),
):
    """Ambil soul (personalisasi) Angie saat ini. Hanya admin."""
    return SoulResponse(soul=repo.get_soul())


@router.put("/soul", response_model=SoulResponse)
def update_soul(
    payload: SoulUpdate,
    _: Annotated[str, Depends(validate_token)],
    repo: ChatbotRepository = Depends(_get_repo),
):
    """Update soul (personalisasi) Angie. Hanya admin.

    Soul ditulis dalam Markdown dan diinjeksi ke system prompt LLM.
    Aturan keamanan tetap ditambahkan secara otomatis oleh sistem
    dan tidak bisa dihapus melalui soul.
    """
    updated = repo.update_soul(payload.soul)
    return SoulResponse(soul=updated)
