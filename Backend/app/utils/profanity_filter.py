"""Filter kata kasar / tidak sopan untuk chatbot Angie.

Arsitektur dua-lapis:
1. Normalisasi leet-speak & obfuscation (m4mak → mamak, a**ing → anjing)
2. Pencocokan terhadap daftar kata terlarang (regex word-boundary aware)

Return ProfanityResult yang memberitahu caller:
  - CLEAN      : tidak ada kata kasar
  - MASKED     : ada kata kasar, sudah disensor (bintang) — boleh dilanjut
  - BLOCKED    : kata kasar berat / ujaran kebencian — tolak langsung

Desain:
  - Tidak memblokir pertanyaan sah yang KEBETULAN mengandung substring terlarang.
    Misal: "pengurus" mengandung "anjing"? Tidak, karena pakai word-boundary regex.
  - Case-insensitive, normalisasi whitespace sebelum cek.
  - Daftar kata dikelola di PROFANITY_LIST dan HARD_BLOCKED_LIST di file ini.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class ProfanityLevel(str, Enum):
    CLEAN   = "clean"
    MASKED  = "masked"    # Ada kata kasar ringan — disensor lalu dilanjut
    BLOCKED = "blocked"   # Kata berat / ujaran kebencian — tolak


@dataclass
class ProfanityResult:
    level:          ProfanityLevel
    cleaned_text:   str             # Teks yang sudah disensor (jika MASKED)
    matched_word:   Optional[str]   # Kata yang memicu (untuk logging)


# ── Normalisasi leet-speak dan karakter pengganti ────────────────────────────
# Urutan penting: karakter multi-char dulu, baru single-char.
_LEET_MAP: list[tuple[str, str]] = [
    # Angka → huruf
    ("0", "o"), ("1", "i"), ("3", "e"), ("4", "a"),
    ("5", "s"), ("7", "t"), ("8", "b"), ("@", "a"),
    # Karakter khusus yang sering dipakai untuk obfuscate
    ("$", "s"), ("!", "i"), ("+", "t"),
    # Karakter berulang direduksi (aanjjiinngg → anjing) — ditangani terpisah
]

_REPEATED_CHAR_RE = re.compile(r"(.)\1+")  # 2+ karakter berulang → 1 (aanjjing → anjing)


def _normalize(text: str) -> str:
    """Normalisasi teks untuk mendeteksi obfuscation.

    Hanya digunakan untuk PENCOCOKAN — teks asli (yang di-mask) tetap pakai text
    original agar tidak merusak kalimat sah yang mengandung angka.
    """
    t = text.lower()
    # Hapus tanda baca yang sering diselipkan di tengah kata (a.n.j.i.n.g)
    t = re.sub(r"(?<=\w)[.\-_*](?=\w)", "", t)
    # Leet-speak → huruf biasa
    for leet, normal in _LEET_MAP:
        t = t.replace(leet, normal)
    # Karakter berulang berlebih → tunggal (aanjjiingg → anjing... ish)
    t = _REPEATED_CHAR_RE.sub(r"\1", t)
    return t


# ── Daftar kata kasar RINGAN → di-mask dengan bintang ────────────────────────
# Gunakan stem / variasi inti. Regex word-boundary (\b) ditambahkan otomatis.
# Kata yang betul-betul netral tapi homografi harus TIDAK masuk daftar ini.
_PROFANITY_WORDS: list[str] = [
    # Umpatan umum Indonesia
    "anjing", "anjir", "anj", "babi", "bangsat", "brengsek",
    "keparat", "kurang ajar", "sial", "sialan",
    "goblok", "goblog", "tolol", "idiot", "bodoh banget",
    "kampret", "bajingan", "bedebah", "tai", "tahi",
    "kontol", "memek", "ngentot", "ngewe",
    "jancok", "jancuk", "cuk", "cok",
    "asu", "asuw", "asuu",
    "kimak", "kiamak",
    "bajigur", "bugil", "telanjang",
    "mampus", "matilah", "mati lo", "mati kau",
    # Varian / typo umum
    "a*jing", "b*bi", "b4ngsat",
]

# ── Kata berat / ujaran kebencian → BLOCKED (langsung ditolak) ───────────────
# Kata yang sangat ofensif, rasis, atau mengandung ancaman — tidak di-mask.
_HARD_BLOCKED_WORDS: list[str] = [
    # Ujaran kebencian berbasis ras/etnis/agama (contoh tanpa menyebut)
    "kafir mati", "bunuh diri", "bunuh saja", "bunuh dia",
    "aku akan bunuh", "saya akan bunuh", "gua bunuh",
    "n*gger", "nigger", "keling babi", "cina babi", "china babi",
    "inlander",
    # Konten seksual eksplisit terhadap orang
    "perkosa", "diperkosa",
    # Ancaman langsung
    "kubunuh", "ku bunuh", "gw bunuh", "gue bunuh", "lo gua bunuh",
]


def _make_pattern(words: list[str]) -> re.Pattern:
    """Kompilasi regex dari daftar kata dengan word-boundary."""
    # Escape semua kata, urutkan dari terpanjang agar tidak ada prefix yang menang duluan
    escaped = sorted([re.escape(w.lower()) for w in words], key=len, reverse=True)
    pattern = r"\b(" + "|".join(escaped) + r")\b"
    return re.compile(pattern, re.IGNORECASE)


_PROFANITY_RE    = _make_pattern(_PROFANITY_WORDS)
_HARD_BLOCKED_RE = _make_pattern(_HARD_BLOCKED_WORDS)


def _mask_word(match: re.Match) -> str:
    """Ganti kata kasar dengan bintang, pertahankan panjangnya."""
    word = match.group(0)
    if len(word) <= 2:
        return "*" * len(word)
    # Perlihatkan huruf pertama + bintang + huruf terakhir: anjing → a****g
    return word[0] + "*" * (len(word) - 2) + word[-1]


def check_profanity(text: str) -> ProfanityResult:
    """Periksa teks dari kata kasar dan kembalikan ProfanityResult.

    Proses:
    1. Normalisasi teks (leet-speak, obfuscation)
    2. Cek kata berat (hard-blocked) → BLOCKED jika cocok
    3. Cek kata kasar ringan (profanity) → MASKED jika cocok
    4. CLEAN jika tidak ada
    """
    normalized = _normalize(text)

    # Cek kata berat dulu
    hard_match = _HARD_BLOCKED_RE.search(normalized)
    if hard_match:
        logger.warning(
            "[ProfanityFilter] BLOCKED | word=%r | preview=%.60r",
            hard_match.group(0),
            text,
        )
        return ProfanityResult(
            level=ProfanityLevel.BLOCKED,
            cleaned_text=text,
            matched_word=hard_match.group(0),
        )

    # Cek kata kasar ringan — mask pada teks ASLI (bukan normalized)
    soft_match = _PROFANITY_RE.search(normalized)
    if soft_match:
        # Mask di teks asli: cari posisi yang sama menggunakan teks asli
        masked = _PROFANITY_RE.sub(_mask_word, text)
        logger.info(
            "[ProfanityFilter] MASKED | word=%r | preview=%.60r",
            soft_match.group(0),
            text,
        )
        return ProfanityResult(
            level=ProfanityLevel.MASKED,
            cleaned_text=masked,
            matched_word=soft_match.group(0),
        )

    return ProfanityResult(
        level=ProfanityLevel.CLEAN,
        cleaned_text=text,
        matched_word=None,
    )


# Pesan balasan Angie saat teks di-BLOCK
MSG_PROFANITY_BLOCKED = (
    "Hei, Angie minta maaf, tapi aku tidak bisa merespons pesan yang mengandung "
    "kata-kata tidak sopan atau berbahaya ya 🙏. "
    "Yuk coba tanyakan dengan bahasa yang lebih ramah!"
)
