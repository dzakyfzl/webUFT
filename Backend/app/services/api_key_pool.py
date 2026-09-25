"""API Key Pool dengan mekanisme failover otomatis.

Kelola pool API key Gemini yang terenkripsi di database.
Saat satu key gagal, otomatis berpindah ke key berikutnya berdasarkan priority.

Mekanisme cooldown:
- 401/403 (key invalid): status -> disabled, perlu intervensi admin
- 429 (rate limit):      status -> exhausted, cooldown 60 menit
- 500/timeout (>=3x):    status -> failed,    cooldown 30 menit
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.encryption import KeyEncryption
from app.models.entities import ChatbotApiKey

logger = logging.getLogger(__name__)

# Durasi cooldown (dalam menit)
COOLDOWN_RATE_LIMIT_MINUTES = 60
COOLDOWN_FAIL_MINUTES = 30
MAX_FAIL_COUNT = 3


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ApiKeyPool:
    """Manajemen pool API key Gemini dengan failover otomatis."""

    def __init__(self, db: Session, encryption: KeyEncryption) -> None:
        self.db = db
        self.encryption = encryption

    # ── Internal helpers ──────────────────────────────────────────────────

    def _get_active_records(self) -> list[ChatbotApiKey]:
        """Ambil semua key yang eligible: aktif dan tidak dalam cooldown."""
        now = _now()
        return (
            self.db.query(ChatbotApiKey)
            .filter(
                ChatbotApiKey.status.in_(["active", "failed", "exhausted"]),
                or_(
                    ChatbotApiKey.cooldown_until.is_(None),
                    ChatbotApiKey.cooldown_until <= now,
                ),
            )
            .order_by(ChatbotApiKey.priority.asc(), ChatbotApiKey.id.asc())
            .all()
        )

    def _decrypt_key(self, record: ChatbotApiKey) -> str:
        """Dekripsi key — JANGAN log hasilnya."""
        return self.encryption.decrypt(
            record.encrypted_key, record.nonce, record.tag
        )

    # ── Public API ────────────────────────────────────────────────────────

    def get_active_key(self) -> tuple[int, str] | tuple[None, None]:
        """Ambil (key_id, api_key) dari pool yang siap dipakai.

        Returns:
            (key_id, decrypted_api_key) jika ada key tersedia.
            (None, None) jika semua key sedang cooldown/disabled.
        """
        records = self._get_active_records()
        if not records:
            logger.warning("API key pool: tidak ada key aktif yang tersedia")
            return None, None

        record = records[0]
        # Update last_used_at
        record.last_used_at = _now()
        record.total_requests = (record.total_requests or 0) + 1
        self.db.commit()

        return record.id, self._decrypt_key(record)

    def report_success(self, key_id: int) -> None:
        """Reset fail_count dan pastikan status kembali active."""
        try:
            record = self.db.get(ChatbotApiKey, key_id)
            if not record:
                return
            record.fail_count = 0
            record.status = "active"
            record.cooldown_until = None
            self.db.commit()
            logger.debug("Key #%d berhasil digunakan, status reset ke active", key_id)
        except Exception:
            self.db.rollback()
            logger.exception("report_success gagal untuk key #%d", key_id)

    def report_failure(self, key_id: int, error_type: str) -> None:
        """Catat kegagalan dan atur cooldown/status sesuai jenis error.

        Args:
            key_id: ID key yang gagal.
            error_type: "invalid" | "rate_limit" | "timeout" | "server_error"
        """
        try:
            record = self.db.get(ChatbotApiKey, key_id)
            if not record:
                return

            now = _now()
            record.last_failed_at = now

            if error_type == "invalid":
                # Key tidak valid — nonaktifkan, perlu admin intervensi
                record.status = "disabled"
                record.cooldown_until = None
                logger.error(
                    "Key #%d (preview: %s) dinyatakan INVALID (401/403). "
                    "Perlu ditambah/diganti via admin panel.",
                    key_id, record.key_preview,
                )

            elif error_type == "rate_limit":
                # Key kena rate limit — cooldown 1 jam
                record.status = "exhausted"
                record.cooldown_until = now + timedelta(minutes=COOLDOWN_RATE_LIMIT_MINUTES)
                logger.warning(
                    "Key #%d kena rate limit (429). Cooldown %d menit.",
                    key_id, COOLDOWN_RATE_LIMIT_MINUTES,
                )

            else:
                # Error server / timeout — increment fail counter
                record.fail_count = (record.fail_count or 0) + 1
                if record.fail_count >= MAX_FAIL_COUNT:
                    record.status = "failed"
                    record.cooldown_until = now + timedelta(minutes=COOLDOWN_FAIL_MINUTES)
                    logger.warning(
                        "Key #%d gagal %d kali berturut-turut. Cooldown %d menit.",
                        key_id, MAX_FAIL_COUNT, COOLDOWN_FAIL_MINUTES,
                    )
                else:
                    logger.warning(
                        "Key #%d error (%s). Fail count: %d/%d.",
                        key_id, error_type, record.fail_count, MAX_FAIL_COUNT,
                    )

            self.db.commit()
        except Exception:
            self.db.rollback()
            logger.exception("report_failure gagal untuk key #%d (error_type=%s)", key_id, error_type)

    def add_key(self, api_key: str, label: str, priority: int = 0) -> ChatbotApiKey:
        """Tambah API key baru ke pool (dienkripsi sebelum disimpan).

        Args:
            api_key: API key Gemini plaintext (HANYA ada di memory, tidak di-log).
            label: Label deskriptif, misal "Key Utama".
            priority: Urutan preferensi (0 = paling tinggi).

        Returns:
            Record ChatbotApiKey yang baru dibuat.
        """
        ciphertext, nonce, tag = self.encryption.encrypt(api_key)
        preview = KeyEncryption.make_preview(api_key)

        record = ChatbotApiKey(
            label=label,
            encrypted_key=ciphertext,
            nonce=nonce,
            tag=tag,
            key_preview=preview,
            status="active",
            priority=priority,
            fail_count=0,
            total_requests=0,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        logger.info("Key baru ditambahkan: #%d (%s, priority=%d)", record.id, preview, priority)
        return record

    def remove_key(self, key_id: int) -> bool:
        """Hapus key dari pool.

        Returns:
            True jika berhasil dihapus, False jika key tidak ditemukan.
        """
        record = self.db.get(ChatbotApiKey, key_id)
        if not record:
            return False
        logger.info("Key #%d (%s) dihapus dari pool", key_id, record.key_preview)
        self.db.delete(record)
        self.db.commit()
        return True

    def toggle_key(self, key_id: int) -> ChatbotApiKey | None:
        """Toggle status antara active dan disabled."""
        record = self.db.get(ChatbotApiKey, key_id)
        if not record:
            return None
        record.status = "disabled" if record.status == "active" else "active"
        if record.status == "active":
            record.fail_count = 0
            record.cooldown_until = None
        self.db.commit()
        self.db.refresh(record)
        return record

    def reset_key(self, key_id: int) -> ChatbotApiKey | None:
        """Reset fail_count dan cooldown sebuah key (untuk admin manual reset)."""
        record = self.db.get(ChatbotApiKey, key_id)
        if not record:
            return None
        record.fail_count = 0
        record.status = "active"
        record.cooldown_until = None
        record.last_failed_at = None
        self.db.commit()
        self.db.refresh(record)
        logger.info("Key #%d direset oleh admin", key_id)
        return record

    def list_keys(self) -> list[ChatbotApiKey]:
        """List semua key (dengan data terenkripsi — jangan expose ke frontend langsung).

        Frontend hanya boleh terima key_preview, bukan encrypted_key/nonce/tag.
        """
        return (
            self.db.query(ChatbotApiKey)
            .order_by(ChatbotApiKey.priority.asc(), ChatbotApiKey.id.asc())
            .all()
        )
