"""Read-only repository untuk data publik yang dibutuhkan chatbot Angie.

╔══════════════════════════════════════════════════════════════════════════╗
║  SECURITY CONTRACT — JANGAN DILANGGAR                                   ║
║                                                                          ║
║  1. File ini HANYA boleh import model: Acara                            ║
║  2. DILARANG import: Akun, Token, Responden, ChatbotApiKey,             ║
║     ChatbotKnowledge, ChatbotConversation, atau model sensitif lainnya  ║
║  3. Semua method HANYA boleh SELECT — tidak ada INSERT/UPDATE/DELETE    ║
║  4. Semua query di-hardcode — tidak ada parameter yang menjadi          ║
║     bagian string SQL                                                    ║
║  5. Return value HANYA berisi kolom publik yang sudah di-whitelist      ║
╚══════════════════════════════════════════════════════════════════════════╝
"""
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

# ⚠️ WHITELIST IMPORT — HANYA model yang aman untuk chatbot
# Tambahkan model lain HANYA setelah review keamanan eksplisit
from app.models.entities import Acara

# ❌ DILARANG — uncomment baris di bawah ini akan melanggar security contract:
# from app.models.entities import Akun
# from app.models.entities import Token
# from app.models.entities import Responden
# from app.models.entities import ChatbotApiKey
# from app.models.entities import ChatbotConversation

logger = logging.getLogger(__name__)

# Kolom yang DIIZINKAN untuk dikirim ke chatbot
# acaraID, fileID, geo_* TIDAK ada di sini — sengaja
_SAFE_ACARA_COLUMNS = [
    Acara.nama,
    Acara.deskripsi,
    Acara.tempat,
    Acara.waktu,
    Acara.waktu_selesai,
    Acara.status,
]

# Status yang dianggap publik (draft tidak dikonsumsi chatbot)
_PUBLIC_STATUSES = ("Aktif", "Selesai", "Akan Datang")

# Panjang maksimum deskripsi yang dikirim ke LLM (karakter)
_MAX_DESC_LEN = 200


def _truncate(text: str | None) -> str | None:
    """Truncate deskripsi agar tidak membengkakkan token LLM."""
    if not text:
        return None
    return text[:_MAX_DESC_LEN] + ("..." if len(text) > _MAX_DESC_LEN else "")


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _row_to_dict(row, include_desc: bool = True) -> dict:
    """Konversi row query ke dict — hanya kolom publik."""
    data: dict = {
        "nama": row.nama,
        "tempat": row.tempat,
        "waktu": _iso(row.waktu),
        "waktu_selesai": _iso(row.waktu_selesai),
        "status": row.status,
    }
    if include_desc:
        data["deskripsi"] = _truncate(row.deskripsi)
    return data


class ChatbotContextRepository:
    """Read-only repository untuk konteks publik chatbot.

    Hanya SELECT. Tidak bisa dipakai untuk write operations.
    Akses dibatasi ke model Acara dengan kolom yang sudah di-whitelist.
    """

    def __init__(self, db: Session) -> None:
        # Nama _db (underscore) untuk menandai: akses internal only, bukan public API
        self._db = db

    def get_upcoming_events(self, limit: int = 10) -> list[dict]:
        """Acara yang akan datang (waktu mulai > sekarang).

        Hanya status publik. Diurutkan dari paling dekat.
        """
        now = datetime.now()
        stmt = (
            select(*_SAFE_ACARA_COLUMNS)
            .where(
                Acara.waktu > now,
                Acara.status.in_(_PUBLIC_STATUSES),
            )
            .order_by(Acara.waktu.asc())
            .limit(max(1, min(limit, 20)))  # Hard cap 20
        )
        rows = self._db.execute(stmt).all()
        return [_row_to_dict(r) for r in rows]

    def get_ongoing_events(self) -> list[dict]:
        """Acara yang sedang berlangsung (waktu <= now <= waktu_selesai)."""
        now = datetime.now()
        stmt = (
            select(*_SAFE_ACARA_COLUMNS)
            .where(
                Acara.waktu <= now,
                Acara.waktu_selesai >= now,
                Acara.status.in_(_PUBLIC_STATUSES),
            )
            .order_by(Acara.waktu.asc())
            .limit(10)
        )
        rows = self._db.execute(stmt).all()
        return [_row_to_dict(r) for r in rows]

    def get_recent_events(self, limit: int = 5) -> list[dict]:
        """Acara yang baru selesai (waktu_selesai < now). Tanpa deskripsi."""
        now = datetime.now()
        stmt = (
            select(*_SAFE_ACARA_COLUMNS)
            .where(
                Acara.waktu_selesai < now,
                Acara.status.in_(_PUBLIC_STATUSES),
            )
            .order_by(Acara.waktu_selesai.desc())
            .limit(max(1, min(limit, 10)))  # Hard cap 10
        )
        rows = self._db.execute(stmt).all()
        return [_row_to_dict(r, include_desc=False) for r in rows]

    def has_any_events(self) -> bool:
        """Cek apakah ada acara publik sama sekali (untuk short-circuit cache)."""
        stmt = (
            select(Acara.acaraID)
            .where(Acara.status.in_(_PUBLIC_STATUSES))
            .limit(1)
        )
        return self._db.execute(stmt).first() is not None
