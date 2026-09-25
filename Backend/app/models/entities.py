from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, LargeBinary, String, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Token(Base):
    __tablename__ = "token"
    tokenID = Column(Text, primary_key=True, index=True)
    respondens = relationship("Responden", back_populates="token")
    akuns = relationship("Akun", back_populates="token")


class Acara(Base):
    __tablename__ = "acara"
    acaraID = Column(Integer, primary_key=True, index=True)
    fileID = Column(Integer, ForeignKey("file.fileID"))
    nama = Column(String(255), nullable=False)
    deskripsi = Column(Text)
    tempat = Column(String(255))
    waktu = Column(DateTime)
    waktu_selesai = Column(DateTime)
    status = Column(String(50))
    geo_latitude  = Column(Float, nullable=True)   # Titik pusat latitude
    geo_longitude = Column(Float, nullable=True)   # Titik pusat longitude
    geo_radius    = Column(Integer, nullable=True)  # Radius dalam meter
    geo_toleransi = Column(Integer, nullable=True)  # Toleransi tambahan dalam meter (default: 20m)
    file = relationship("File", back_populates="acaras")
    respondens = relationship("Responden", back_populates="acara")
    karyas = relationship("Karya", back_populates="acara")


class File(Base):
    __tablename__ = "file"
    fileID = Column(Integer, primary_key=True, index=True)
    nama = Column(String(255))
    jenis = Column(String(50))
    ukuran = Column(Integer)
    direktori = Column(String(500))
    acaras = relationship("Acara", back_populates="file")
    karyas = relationship("Karya", back_populates="file")
    fotos = relationship("Foto", back_populates="file")


class Responden(Base):
    __tablename__ = "responden"
    respID = Column(Integer, primary_key=True, index=True)
    acaraID = Column(Integer, ForeignKey("acara.acaraID"))
    tokenID = Column(Text, ForeignKey("token.tokenID"))
    nama = Column(String(255))
    prodi_instansi = Column(String(255))
    nim = Column(String(50), nullable=True)
    acara = relationship("Acara", back_populates="respondens")
    token = relationship("Token", back_populates="respondens")
    pilihans = relationship("Pilihan", back_populates="responden")


class Karya(Base):
    __tablename__ = "karya"
    karyaID = Column(Integer, primary_key=True, index=True)
    acaraID = Column(Integer, ForeignKey("acara.acaraID"))
    fileID = Column(Integer, ForeignKey("file.fileID"))
    nama = Column(String(255))
    deskripsi = Column(Text)
    pemilik = Column(String(255))
    acara = relationship("Acara", back_populates="karyas")
    file = relationship("File", back_populates="karyas")
    pilihans = relationship("Pilihan", back_populates="karya")


class Pilihan(Base):
    __tablename__ = "pilihan"
    respID = Column(Integer, ForeignKey("responden.respID"), primary_key=True)
    karyaID = Column(Integer, ForeignKey("karya.karyaID"), primary_key=True)
    responden = relationship("Responden", back_populates="pilihans")
    karya = relationship("Karya", back_populates="pilihans")


class Akun(Base):
    __tablename__ = "akun"
    akunID = Column(Integer, primary_key=True, index=True)
    tokenID = Column(Text, ForeignKey("token.tokenID"), nullable=True)
    username = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    salt = Column(String(255))
    role = Column(String(50))
    token = relationship("Token", back_populates="akuns")
    akses = relationship("Akses", back_populates="akun")


class Bidang(Base):
    __tablename__ = "bidang"
    bidangID = Column(Integer, primary_key=True, index=True)
    nama = Column(String(255), nullable=False)
    akses = relationship("Akses", back_populates="bidang")


class Akses(Base):
    __tablename__ = "akses"
    bidangID = Column(Integer, ForeignKey("bidang.bidangID"), primary_key=True)
    akunID = Column(Integer, ForeignKey("akun.akunID"), primary_key=True)
    akun = relationship("Akun", back_populates="akses")
    bidang = relationship("Bidang", back_populates="akses")


class Foto(Base):
    __tablename__ = "foto"
    fotoID = Column(Integer, primary_key=True, index=True)
    albumID = Column(Integer, ForeignKey("album.albumID"))
    nama = Column(String(255))
    pemilik = Column(String(255))
    fileID = Column(Integer, ForeignKey("file.fileID"))
    file = relationship("File", back_populates="fotos")
    album = relationship("Album", back_populates="fotos")


class Album(Base):
    __tablename__ = "album"
    albumID = Column(Integer, primary_key=True, index=True)
    nama = Column(String(255), nullable=False)
    deskripsi = Column(Text, nullable=True)
    fotos = relationship("Foto", back_populates="album")

class ShortLink(Base):
    __tablename__ = "shortlink"
    linkID = Column(Integer, primary_key=True, index=True)
    destinationUrl = Column(Text, nullable=False)
    slug = Column(String(255), nullable=False, unique=True)


class LastMigrate(Base):
    __tablename__ = "last_migrate"
    migrateID = Column(Integer, primary_key=True, index=True)
    exported_at = Column(DateTime, nullable=False)
    imported_at = Column(DateTime, nullable=True)
    exporter_username = Column(String(255), nullable=False)
    importer_username = Column(String(255), nullable=True)


# ─── Chatbot Angie ───────────────────────────────────────────────────────────

class ChatbotApiKey(Base):
    """Pool API key Gemini, disimpan terenkripsi AES-256-GCM."""
    __tablename__ = "chatbot_api_key"
    id             = Column(Integer, primary_key=True, index=True)
    label          = Column(String(100), nullable=False)          # nama label, misal "Key 1"
    encrypted_key  = Column(LargeBinary, nullable=False)           # AES-256-GCM ciphertext
    nonce          = Column(LargeBinary, nullable=False)            # GCM nonce (12 bytes)
    tag            = Column(LargeBinary, nullable=False)            # GCM auth tag (16 bytes)
    key_preview    = Column(String(20), nullable=False)             # "AIza...7xQ" — display only
    status         = Column(String(20), default="active", nullable=False)  # active|failed|exhausted|disabled
    priority       = Column(Integer, default=0, nullable=False)     # urutan rotasi, 0 = tertinggi
    fail_count     = Column(Integer, default=0, nullable=False)
    last_used_at   = Column(DateTime, nullable=True)
    last_failed_at = Column(DateTime, nullable=True)
    cooldown_until = Column(DateTime, nullable=True)
    total_requests = Column(Integer, default=0, nullable=False)
    created_at     = Column(DateTime, server_default=func.now())


class ChatbotKnowledge(Base):
    """Knowledge base untuk RAG. Embedding 768-dim disimpan di pgvector."""
    __tablename__ = "chatbot_knowledge"
    id         = Column(Integer, primary_key=True, index=True)
    category   = Column(String(100), nullable=False)               # "umum", "faq", dll
    question   = Column(Text, nullable=False)
    answer     = Column(Text, nullable=False)
    # Kolom 'embedding' bertipe vector(768) — dideklarasikan via DDL di migration.
    # Tidak ada kolom SQLAlchemy di sini agar tidak butuh sqlalchemy-pgvector saat dev.
    is_active  = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class ChatbotUnanswered(Base):
    """Pertanyaan yang tidak ditemukan jawabannya di knowledge base."""
    __tablename__ = "chatbot_unanswered"
    id                    = Column(Integer, primary_key=True, index=True)
    question              = Column(Text, nullable=False)
    user_ip               = Column(String(50), nullable=True)
    asked_at              = Column(DateTime, server_default=func.now())
    is_resolved           = Column(Boolean, default=False, nullable=False)
    resolved_knowledge_id = Column(Integer, ForeignKey("chatbot_knowledge.id"), nullable=True)
    resolved_knowledge    = relationship("ChatbotKnowledge")


class ChatbotConversation(Base):
    """Log percakapan per session (in-memory di frontend, disimpan di backend untuk context window)."""
    __tablename__ = "chatbot_conversation"
    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True, nullable=False)   # UUID per browser tab
    role       = Column(String(10), nullable=False)                 # "user" | "assistant"
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class ChatbotConfig(Base):
    """Konfigurasi global chatbot: token limit harian, kill switch."""
    __tablename__ = "chatbot_config"
    id                = Column(Integer, primary_key=True)
    daily_token_limit = Column(Integer, default=1_000_000, nullable=False)
    tokens_used_today = Column(Integer, default=0, nullable=False)
    last_reset_date   = Column(DateTime, nullable=True)
    is_active         = Column(Boolean, default=True, nullable=False)  # kill switch
