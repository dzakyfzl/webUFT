"""Pydantic schemas untuk chatbot Angie."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ── Chat ─────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="Pesan dari user")
    session_id: str = Field(..., description="UUID sesi browser — di-generate frontend tiap load")

    @field_validator("session_id")
    @classmethod
    def validate_session_id(cls, v: str) -> str:
        """Pastikan session_id adalah UUID yang valid.

        Mencegah user menebak session_id orang lain dengan string sembarang.
        """
        try:
            parsed = uuid.UUID(v)
            return str(parsed)  # Normalisasi ke lowercase canonical form
        except (ValueError, AttributeError):
            raise ValueError("session_id harus berupa UUID yang valid")


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    is_fallback: bool = False   # True jika jawaban dari fallback (unanswered/resting)
    is_resting: bool = False    # True jika Angie sedang beristirahat (token habis)


# ── Knowledge Base ────────────────────────────────────────────────────────────

class KnowledgeCreate(BaseModel):
    """Buat knowledge baru.

    content_type='qa'   : wajib isi question + answer.
    content_type='text' : wajib isi content (teks bebas).
    """
    category:     str           = Field(..., min_length=1, max_length=100)
    content_type: str           = Field(default="qa", pattern="^(qa|text)$")
    question:     Optional[str] = None
    answer:       Optional[str] = None
    content:      Optional[str] = None  # untuk content_type='text'

    @field_validator("question", "answer", mode="before")
    @classmethod
    def check_qa_fields(cls, v):
        return v  # validasi silang dilakukan di model_validator

    @classmethod
    def model_validate_with_type(cls, data):
        return cls.model_validate(data)

    def validate_required_fields(self) -> None:
        """Panggil setelah konstruksi untuk cek konsistensi fields."""
        if self.content_type == "qa":
            if not self.question or not self.answer:
                raise ValueError("content_type='qa' membutuhkan question dan answer")
        elif self.content_type == "text":
            if not self.content:
                raise ValueError("content_type='text' membutuhkan content")


class KnowledgeUpdate(BaseModel):
    category:     Optional[str]  = None
    content_type: Optional[str]  = Field(default=None, pattern="^(qa|text)$")
    question:     Optional[str]  = None
    answer:       Optional[str]  = None
    content:      Optional[str]  = None
    is_active:    Optional[bool] = None


class KnowledgeResponse(BaseModel):
    id:           int
    category:     str
    content_type: str
    question:     Optional[str] = None
    answer:       Optional[str] = None
    content:      Optional[str] = None
    is_active:    bool
    created_at:   datetime
    updated_at:   Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Unanswered Questions ─────────────────────────────────────────────────────

class UnansweredResponse(BaseModel):
    id: int
    question: str
    user_ip: Optional[str] = None
    asked_at: datetime
    is_resolved: bool
    resolved_knowledge_id: Optional[int] = None

    model_config = {"from_attributes": True}


class UnansweredResolve(BaseModel):
    answer: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1, max_length=100)


# ── API Key Pool ──────────────────────────────────────────────────────────────

class ApiKeyCreate(BaseModel):
    api_key: str = Field(..., min_length=10, description="API key Gemini plaintext — hanya dikirim sekali, tidak disimpan plain")
    label: str = Field(..., min_length=1, max_length=100)
    priority: int = Field(default=0, ge=0)


class ApiKeyResponse(BaseModel):
    id: int
    label: str
    key_preview: str            # "AIza...7xQ" — key asli TIDAK pernah dikirim ke frontend
    status: str                 # active | failed | exhausted | disabled
    priority: int
    fail_count: int
    total_requests: int
    last_used_at: Optional[datetime] = None
    last_failed_at: Optional[datetime] = None
    cooldown_until: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Stats ─────────────────────────────────────────────────────────────────────

class ChatbotStats(BaseModel):
    tokens_used_today: int
    daily_token_limit: int
    token_usage_pct: float          # 0.0 – 100.0
    is_active: bool
    total_conversations_today: int
    total_unanswered: int
    total_knowledge: int
    active_keys: int
    failed_keys: int


# ── Seed ─────────────────────────────────────────────────────────────────────

class SeedEntry(BaseModel):
    category:     str           = Field(..., min_length=1)
    content_type: str           = Field(default="qa", pattern="^(qa|text)$")
    question:     Optional[str] = None
    answer:       Optional[str] = None
    content:      Optional[str] = None


class SeedRequest(BaseModel):
    entries: list[SeedEntry]


class SeedResponse(BaseModel):
    inserted: int
    skipped: int
    message: str


# ── Soul ─────────────────────────────────────────────────────────────────────

class SoulResponse(BaseModel):
    soul: str


class SoulUpdate(BaseModel):
    soul: str = Field(..., min_length=1, description="Markdown personalisasi Angie")
