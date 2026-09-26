"""Service yang membangun teks konteks live dari data publik untuk chatbot Angie.

Tidak menerima raw SQLAlchemy Session — hanya ChatbotContextRepository.
Menyediakan in-memory TTL cache untuk mengurangi beban DB.
"""
import logging
from datetime import datetime, timedelta
from threading import Lock

from app.repositories.chatbot_context_repository import ChatbotContextRepository

logger = logging.getLogger(__name__)

_CACHE_TTL = timedelta(minutes=5)

_HEADER = "=== INFORMASI ACARA UFT TERKINI (DATA REAL-TIME) ==="
_NO_EVENT_MSG = "Saat ini tidak ada informasi acara UFT yang tersedia."


def _format_datetime(iso_str: str | None) -> str:
    """Ubah ISO string menjadi format Indonesia yang mudah dibaca."""
    if not iso_str:
        return "TBA"
    try:
        dt = datetime.fromisoformat(iso_str)
        return dt.strftime("%-d %B %Y pukul %H:%M")
    except ValueError:
        return iso_str


class ChatbotContextService:
    """Membangun blok teks konteks acara untuk disisipkan ke prompt Angie.

    - Cache di-invalidate setiap 5 menit (TTL)
    - Thread-safe via Lock
    - Tidak punya akses ke model lain selain yang disediakan repo
    """

    def __init__(self, context_repo: ChatbotContextRepository) -> None:
        self._repo = context_repo
        self._cache: str | None = None
        self._cache_time: datetime | None = None
        self._lock = Lock()

    def _is_cache_valid(self) -> bool:
        return (
            self._cache is not None
            and self._cache_time is not None
            and (datetime.now() - self._cache_time) < _CACHE_TTL
        )

    def _build(self) -> str:
        """Bangun teks konteks dari DB. Dipanggil saat cache miss."""
        sections: list[str] = []

        # 1. Acara yang sedang berlangsung
        try:
            ongoing = self._repo.get_ongoing_events()
            if ongoing:
                lines = ["🔴 ACARA SEDANG BERLANGSUNG:"]
                for i, e in enumerate(ongoing, 1):
                    selesai = _format_datetime(e.get("waktu_selesai"))
                    desc = f" — {e['deskripsi']}" if e.get("deskripsi") else ""
                    lines.append(
                        f"  {i}. {e['nama']} di {e['tempat'] or 'TBA'}"
                        f", berlangsung sampai {selesai}{desc}"
                    )
                sections.append("\n".join(lines))
        except Exception:
            logger.exception("[ContextService] Error fetching ongoing events")

        # 2. Acara yang akan datang
        try:
            upcoming = self._repo.get_upcoming_events(limit=10)
            if upcoming:
                lines = ["📅 ACARA YANG AKAN DATANG:"]
                for i, e in enumerate(upcoming, 1):
                    mulai = _format_datetime(e.get("waktu"))
                    desc = f" — {e['deskripsi']}" if e.get("deskripsi") else ""
                    lines.append(
                        f"  {i}. {e['nama']}"
                        f" — {mulai} di {e['tempat'] or 'TBA'}{desc}"
                    )
                sections.append("\n".join(lines))
        except Exception:
            logger.exception("[ContextService] Error fetching upcoming events")

        # 3. Acara yang baru selesai (untuk referensi)
        try:
            recent = self._repo.get_recent_events(limit=5)
            if recent:
                lines = ["📌 ACARA YANG BARU SELESAI:"]
                for i, e in enumerate(recent, 1):
                    selesai = _format_datetime(e.get("waktu_selesai"))
                    lines.append(
                        f"  {i}. {e['nama']} di {e['tempat'] or 'TBA'}"
                        f", selesai {selesai}"
                    )
                sections.append("\n".join(lines))
        except Exception:
            logger.exception("[ContextService] Error fetching recent events")

        if not sections:
            return _NO_EVENT_MSG

        return _HEADER + "\n" + "\n\n".join(sections)

    def build_live_context(self) -> str:
        """Return teks konteks acara, dari cache atau dari DB.

        Thread-safe. Cache di-refresh setiap 5 menit.
        """
        # Double-checked locking
        if self._is_cache_valid():
            return self._cache  # type: ignore[return-value]

        with self._lock:
            # Cek ulang setelah dapat lock (mungkin thread lain sudah refresh)
            if self._is_cache_valid():
                return self._cache  # type: ignore[return-value]

            result = self._build()
            self._cache = result
            self._cache_time = datetime.now()
            logger.debug("[ContextService] Cache refreshed at %s", self._cache_time)
            return result

    def invalidate_cache(self) -> None:
        """Paksa refresh cache pada request berikutnya.

        Panggil ini setelah admin menyimpan/menghapus acara.
        """
        with self._lock:
            self._cache = None
            self._cache_time = None
            logger.info("[ContextService] Cache invalidated manually")
