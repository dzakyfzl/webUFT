"""Rate limiter sederhana berbasis in-memory per IP untuk endpoint chatbot.

Menggunakan sliding window counter dengan TTL otomatis.
Tidak butuh Redis — cukup untuk single-server deployment.

Batas default: 10 request / 60 detik per IP.
"""
import logging
import time
from collections import defaultdict, deque
from threading import Lock

logger = logging.getLogger(__name__)


class InMemoryRateLimiter:
    """Sliding window rate limiter per IP address.

    Thread-safe via Lock. Otomatis membersihkan entry lama saat hit-rate rendah.
    """

    def __init__(self, max_requests: int = 10, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # {ip: deque([timestamp, ...])}
        self._windows: dict[str, deque] = defaultdict(deque)
        self._lock = Lock()

    def is_allowed(self, ip: str) -> bool:
        """Return True jika request dari IP ini masih dalam batas.

        Args:
            ip: Alamat IP client (sudah dinormalisasi).

        Returns:
            True  → request diizinkan.
            False → request ditolak (rate limit tercapai).
        """
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            window = self._windows[ip]

            # Buang timestamp yang sudah di luar window
            while window and window[0] <= cutoff:
                window.popleft()

            if len(window) >= self.max_requests:
                logger.warning(
                    "[RateLimit] IP %s melebihi batas (%d req/%ds)",
                    ip,
                    self.max_requests,
                    self.window_seconds,
                )
                return False

            window.append(now)
            return True

    def reset(self, ip: str) -> None:
        """Reset counter untuk IP tertentu (untuk testing)."""
        with self._lock:
            self._windows.pop(ip, None)


# Singleton — dibuat sekali saat modul di-import
# 10 request per menit per IP untuk endpoint chat
chat_rate_limiter = InMemoryRateLimiter(max_requests=10, window_seconds=60)
