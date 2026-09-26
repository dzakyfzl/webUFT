"""Utilitas sanitasi input/output untuk chatbot Angie.

Dua lapisan pertahanan:
1. sanitize_input()  — bersihkan pesan user sebelum masuk prompt (log injection pattern)
2. sanitize_output() — scan reply LLM sebelum dikirim ke user (block jika ada data sensitif)
"""
import logging
import re

logger = logging.getLogger(__name__)

# ── Input: Pattern prompt injection yang umum digunakan ──────────────────────
_INJECTION_PATTERNS: list[tuple[str, str]] = [
    (r"(?i)abaikan\s+(semua\s+)?instruksi", "bahasa Indonesia ignore instruction"),
    (r"(?i)lupakan\s+(semua\s+)?instruksi", "bahasa Indonesia forget instruction"),
    (r"(?i)ignore\s+(all\s+)?(previous\s+)?instructions?", "EN ignore instruction"),
    (r"(?i)forget\s+(all\s+)?(previous\s+)?instructions?", "EN forget instruction"),
    (r"(?i)kamu\s+sekarang\s+adalah", "role reassignment ID"),
    (r"(?i)you\s+are\s+now\s+(a\s+)?(?!Angie)", "role reassignment EN"),
    (r"(?i)act\s+as\s+(?!Angie)", "act-as jailbreak"),
    (r"(?i)pretend\s+(you\s+are|to\s+be)", "pretend jailbreak"),
    (r"(?i)(tampilkan|tunjukkan|ceritakan).{0,30}(password|secret|token|key|master)", "secret exfil ID"),
    (r"(?i)(show|reveal|print|display).{0,30}(password|secret|token|api.?key)", "secret exfil EN"),
    (r"(?i)system\s*prompt", "system prompt probe"),
    (r"(?i)---\s*system\s*---", "system marker injection"),
    (r"(?i)<\s*(system|instruction|prompt)\s*>", "XML-style injection"),
]

# ── Output: Pattern data sensitif yang tidak boleh terkirim ke user ──────────
_SENSITIVE_OUTPUT_PATTERNS: list[tuple[str, str]] = [
    (r"AIza[A-Za-z0-9_-]{30,}", "Google API key"),
    (r"(?i)CHATBOT_MASTER_KEY\s*[=:]\s*\S+", "internal env var"),
    (r"(?i)DATABASE_(URL|PASSWORD|USERNAME)\s*[=:]\s*\S+", "DB credential"),
    (r"(?i)hashed_password\s*[=:]\s*\S+", "hashed password"),
    (r"(?i)(instruksi\s+sistem|system\s+instruction|system\s+prompt)\s*[=:]\n?.{0,200}JANGAN", "system prompt leak"),
    (r"(?i)Aturan WAJIB:", "system prompt leak ID"),
]

_MSG_GUARDRAIL_TRIGGERED = (
    "Maaf, Angie tidak dapat memproses respons ini. "
    "Coba tanyakan dengan cara yang berbeda ya! 🙏"
)


def sanitize_input(message: str) -> str:
    """Sanitasi pesan user sebelum dimasukkan ke prompt LLM.

    - Strip control characters berbahaya
    - Log warning jika ditemukan pattern prompt injection
    - TIDAK memblokir — biarkan LLM + system prompt yang menolak
    """
    # Hapus control characters (kecuali tab dan newline biasa)
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", message)

    # Normalisasi whitespace berlebih (tapi pertahankan newline tunggal)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = cleaned.strip()

    # Deteksi dan log injection attempt (tidak diblokir)
    for pattern, label in _INJECTION_PATTERNS:
        if re.search(pattern, cleaned):
            logger.warning(
                "[ChatSanitizer] Potential prompt injection detected | pattern=%s | preview=%.80r",
                label,
                cleaned,
            )
            # Log sekali saja (pattern pertama yang cocok)
            break

    return cleaned


def sanitize_output(reply: str) -> str:
    """Scan reply LLM sebelum dikirim ke user.

    Jika ditemukan pattern data sensitif → return pesan fallback.
    Safety net terakhir setelah semua layer lain.
    """
    if not reply or not reply.strip():
        return _MSG_GUARDRAIL_TRIGGERED

    for pattern, label in _SENSITIVE_OUTPUT_PATTERNS:
        if re.search(pattern, reply):
            logger.error(
                "[ChatSanitizer] Output guardrail TRIGGERED | pattern=%s | preview=%.80r",
                label,
                reply,
            )
            return _MSG_GUARDRAIL_TRIGGERED

    return reply
