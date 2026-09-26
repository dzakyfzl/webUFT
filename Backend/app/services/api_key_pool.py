"""API Key Pool — sticky current key + failover hanya saat gagal.

Desain:
- Satu key aktif sekaligus (_current_idx). Dipakai TERUS sampai gagal.
- get_active_key() = baca satu variabel memory. ZERO DB, ZERO iterasi.
- Rotasi ke key berikutnya HANYA saat report_failure() dipanggil.
- DB hanya diakses saat:
    · Startup (load semua key sekali)
    · Key gagal (persist status + cooldown)
    · Admin ubah key (add/remove/toggle/reset) → invalidate cache
    · Periodic flush total_requests (setiap 50 request)
- Thread-safe via RLock.

Mekanisme cooldown:
- 401/403 (key invalid): status → disabled, perlu intervensi admin
- 429 (rate limit):      status → exhausted, cooldown 60 menit
- 500/timeout (≥3x):    status → failed,    cooldown 30 menit
"""
import logging
import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.encryption import KeyEncryption
from app.models.entities import ChatbotApiKey

logger = logging.getLogger(__name__)

# Durasi cooldown (dalam menit)
COOLDOWN_RATE_LIMIT_MINUTES = 60
COOLDOWN_FAIL_MINUTES = 30
MAX_FAIL_COUNT = 3

# Flush total_requests ke DB setiap N request (kurangi write ke DB)
_FLUSH_EVERY_N_REQUESTS = 50


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@dataclass
class _CachedKey:
    """Representasi in-memory sebuah API key dari pool."""
    id: int
    priority: int
    decrypted_key: str
    key_preview: str
    status: str                          # active | failed | exhausted | disabled
    fail_count: int = 0
    cooldown_until: Optional[datetime] = None
    # Counter lokal — di-flush ke DB secara batch, bukan per-request
    _pending_requests: int = field(default=0, repr=False)

    def is_eligible(self) -> bool:
        """True jika key boleh dipakai sekarang (tidak dalam cooldown/disabled)."""
        if self.status == "disabled":
            return False
        if self.cooldown_until and _now() < self.cooldown_until:
            return False
        return True


class ApiKeyPool:
    """Sticky-key API pool: satu key aktif sampai gagal, lalu otomatis ganti.

    get_active_key() = O(1), baca satu variabel memory, ZERO DB hit.
    DB hanya disentuh saat failure atau admin action.
    Thread-safe via RLock.
    """

    def __init__(self, db: Session, encryption: KeyEncryption) -> None:
        self.db = db
        self.encryption = encryption
        self._lock = threading.RLock()
        self._cache: list[_CachedKey] = []
        self._current_idx: int = 0       # index key yang sedang aktif di _cache
        self._loaded = False

    # ── Cache management ──────────────────────────────────────────────────

    def _ensure_loaded(self) -> None:
        """Load key dari DB ke memory jika belum di-load (lazy init)."""
        if not self._loaded:
            self._reload()

    def _reload(self) -> None:
        """Load semua key dari DB ke in-memory cache.

        Dipanggil sekali saat startup, atau setelah admin mengubah key.
        Setelah ini, get_active_key() tidak menyentuh DB sampai ada kegagalan.
        """
        with self._lock:
            rows: list[ChatbotApiKey] = (
                self.db.query(ChatbotApiKey)
                .order_by(ChatbotApiKey.priority.asc(), ChatbotApiKey.id.asc())
                .all()
            )
            new_cache: list[_CachedKey] = []
            for r in rows:
                try:
                    decrypted = self.encryption.decrypt(r.encrypted_key, r.nonce, r.tag)
                except Exception:
                    logger.exception("Gagal dekripsi key #%d saat reload, dilewati", r.id)
                    continue
                new_cache.append(_CachedKey(
                    id=r.id,
                    priority=r.priority,
                    decrypted_key=decrypted,
                    key_preview=r.key_preview or "",
                    status=r.status,
                    fail_count=r.fail_count or 0,
                    cooldown_until=r.cooldown_until,
                ))
            self._cache = new_cache
            # Cari index pertama yang eligible untuk dijadikan current key
            self._current_idx = self._find_next_eligible_idx(-1)
            self._loaded = True
            active_count = sum(1 for k in self._cache if k.is_eligible())
            logger.info(
                "[ApiKeyPool] Cache dimuat: %d key total, %d eligible, current idx=%d",
                len(self._cache), active_count, self._current_idx,
            )

    def _find_next_eligible_idx(self, from_idx: int) -> int:
        """Cari index key berikutnya yang eligible, mulai setelah from_idx.

        Scan linear dari from_idx+1 hingga akhir list.
        Return -1 jika tidak ada key eligible sama sekali.
        """
        start = from_idx + 1
        for i in range(start, len(self._cache)):
            if self._cache[i].is_eligible():
                return i
        # Tidak ada yang eligible
        return -1

    def _get_cached_by_id(self, key_id: int) -> Optional[_CachedKey]:
        return next((k for k in self._cache if k.id == key_id), None)

    def _flush_requests(self, key_id: int, count: int) -> None:
        """Flush pending request counter ke DB secara batch."""
        if count <= 0:
            return
        try:
            record = self.db.get(ChatbotApiKey, key_id)
            if record:
                record.total_requests = (record.total_requests or 0) + count
                record.last_used_at = _now()
                self.db.commit()
        except Exception:
            self.db.rollback()
            logger.debug(
                "Flush request count gagal untuk key #%d, akan dicoba berikutnya", key_id
            )

    # ── Public API ────────────────────────────────────────────────────────

    def get_active_key(self) -> tuple[int, str] | tuple[None, None]:
        """Return key yang sedang aktif — O(1), ZERO DB hit.

        Key yang sama dipakai berulang sampai report_failure() dipanggil.
        Rotasi hanya terjadi saat failure, bukan setiap request.

        Returns:
            (key_id, decrypted_api_key) jika ada key tersedia.
            (None, None) jika semua key sedang cooldown/disabled.
        """
        self._ensure_loaded()

        with self._lock:
            if self._current_idx < 0 or self._current_idx >= len(self._cache):
                # Tidak ada key — coba re-scan (mungkin ada cooldown yang sudah berakhir)
                self._current_idx = self._find_next_eligible_idx(-1)
                if self._current_idx < 0:
                    logger.warning("[ApiKeyPool] Tidak ada key aktif yang tersedia")
                    return None, None

            current = self._cache[self._current_idx]

            # Jika key saat ini tidak lagi eligible (cooldown baru saja berakhir tidak masalah,
            # tapi jika masih dalam cooldown, cari yang berikutnya)
            if not current.is_eligible():
                next_idx = self._find_next_eligible_idx(-1)  # scan dari awal
                if next_idx < 0:
                    logger.warning("[ApiKeyPool] Semua key sedang cooldown/disabled")
                    return None, None
                self._current_idx = next_idx
                current = self._cache[self._current_idx]

            # Increment counter lokal — tidak commit ke DB
            current._pending_requests += 1
            if current._pending_requests % _FLUSH_EVERY_N_REQUESTS == 0:
                self._flush_requests(current.id, _FLUSH_EVERY_N_REQUESTS)

            return current.id, current.decrypted_key

    def report_success(self, key_id: int) -> None:
        """Tidak perlu melakukan apa-apa pada jalur sukses normal.

        Key sudah aktif dan terus dipakai. DB update hanya terjadi jika
        key sebelumnya berstatus non-active (baru recover dari error).
        """
        self._ensure_loaded()

        with self._lock:
            cached = self._get_cached_by_id(key_id)
            if not cached:
                return

            # Hanya update DB jika status memang perlu diperbaiki
            if cached.status != "active":
                cached.fail_count = 0
                cached.status = "active"
                cached.cooldown_until = None
                try:
                    record = self.db.get(ChatbotApiKey, key_id)
                    if record:
                        record.fail_count = 0
                        record.status = "active"
                        record.cooldown_until = None
                        self.db.commit()
                        logger.info("Key #%d dipulihkan ke status active", key_id)
                except Exception:
                    self.db.rollback()
                    logger.exception("report_success DB update gagal untuk key #%d", key_id)
            # Jika sudah active → tidak ada yang perlu dilakukan. Zero DB hit. ✅

    def report_failure(self, key_id: int, error_type: str) -> None:
        """Catat kegagalan + rotate ke key berikutnya.

        Ini satu-satunya titik di mana rotasi key terjadi.
        DB di-update untuk persistensi status dan cooldown.

        Args:
            key_id: ID key yang gagal.
            error_type: "invalid" | "rate_limit" | "timeout" | "server_error"
        """
        self._ensure_loaded()

        with self._lock:
            cached = self._get_cached_by_id(key_id)
            if not cached:
                return

            # Flush sisa pending requests sebelum key dinonaktifkan
            if cached._pending_requests > 0:
                self._flush_requests(key_id, cached._pending_requests)
                cached._pending_requests = 0

            now = _now()

            if error_type == "invalid":
                cached.status = "disabled"
                cached.cooldown_until = None
                logger.error(
                    "[ApiKeyPool] Key #%d (%s) INVALID (401/403). Perlu diganti via admin.",
                    key_id, cached.key_preview,
                )

            elif error_type == "rate_limit":
                cached.status = "exhausted"
                cached.cooldown_until = now + timedelta(minutes=COOLDOWN_RATE_LIMIT_MINUTES)
                logger.warning(
                    "[ApiKeyPool] Key #%d kena rate limit. Cooldown %d menit.",
                    key_id, COOLDOWN_RATE_LIMIT_MINUTES,
                )

            else:
                cached.fail_count += 1
                if cached.fail_count >= MAX_FAIL_COUNT:
                    cached.status = "failed"
                    cached.cooldown_until = now + timedelta(minutes=COOLDOWN_FAIL_MINUTES)
                    logger.warning(
                        "[ApiKeyPool] Key #%d gagal %d kali. Cooldown %d menit.",
                        key_id, MAX_FAIL_COUNT, COOLDOWN_FAIL_MINUTES,
                    )
                else:
                    logger.warning(
                        "[ApiKeyPool] Key #%d error (%s). Fail count: %d/%d.",
                        key_id, error_type, cached.fail_count, MAX_FAIL_COUNT,
                    )

            # Persist status ke DB (failure selalu perlu disimpan)
            try:
                record = self.db.get(ChatbotApiKey, key_id)
                if record:
                    record.last_failed_at = now
                    record.status = cached.status
                    record.fail_count = cached.fail_count
                    record.cooldown_until = cached.cooldown_until
                    self.db.commit()
            except Exception:
                self.db.rollback()
                logger.exception(
                    "[ApiKeyPool] Gagal persist failure ke DB untuk key #%d", key_id
                )

            # ── Rotasi ke key berikutnya ──────────────────────────────────────
            # Cari key eligible berikutnya setelah current_idx
            next_idx = self._find_next_eligible_idx(self._current_idx)
            if next_idx < 0:
                # Tidak ada yang tersisa setelah current → scan dari awal
                next_idx = self._find_next_eligible_idx(-1)

            self._current_idx = next_idx
            if next_idx >= 0:
                next_key = self._cache[next_idx]
                logger.info(
                    "[ApiKeyPool] Rotasi ke key #%d (%s) setelah key #%d gagal.",
                    next_key.id, next_key.key_preview, key_id,
                )
            else:
                logger.error("[ApiKeyPool] Semua key habis/cooldown. Tidak ada fallback.")

    # ── Admin operations (invalidate cache setelah perubahan) ────────────

    def _invalidate(self) -> None:
        """Tandai cache sebagai stale → akan di-reload pada request berikutnya."""
        with self._lock:
            self._loaded = False
            self._current_idx = 0
            logger.debug("[ApiKeyPool] Cache di-invalidate, akan reload saat request berikutnya")

    def add_key(self, api_key: str, label: str, priority: int = 0) -> ChatbotApiKey:
        """Tambah API key baru ke pool (dienkripsi sebelum disimpan)."""
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
        self._invalidate()
        return record

    def remove_key(self, key_id: int) -> bool:
        """Hapus key dari pool."""
        with self._lock:
            cached = self._get_cached_by_id(key_id)
            if cached and cached._pending_requests > 0:
                self._flush_requests(key_id, cached._pending_requests)

        record = self.db.get(ChatbotApiKey, key_id)
        if not record:
            return False
        logger.info("Key #%d (%s) dihapus dari pool", key_id, record.key_preview)
        self.db.delete(record)
        self.db.commit()
        self._invalidate()
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
        self._invalidate()
        return record

    def reset_key(self, key_id: int) -> ChatbotApiKey | None:
        """Reset fail_count dan cooldown sebuah key (admin manual reset)."""
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
        self._invalidate()
        return record

    def list_keys(self) -> list[ChatbotApiKey]:
        """List semua key dari DB (untuk admin panel — butuh data lengkap)."""
        return (
            self.db.query(ChatbotApiKey)
            .order_by(ChatbotApiKey.priority.asc(), ChatbotApiKey.id.asc())
            .all()
        )
