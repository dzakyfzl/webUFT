import ipaddress
import re
import socket
from urllib.parse import urlsplit

from app.errors import ApiError


def safe_url(value, *, resolve=False, optional=False):
    if not value and optional:
        return ""
    try:
        parts = urlsplit(value)
        host = (parts.hostname or "").rstrip(".").lower()
        if (len(value) > 2000 or any(ord(c) < 33 for c in value) or "\\" in value
                or parts.scheme not in ("https", "http") or not host or parts.username is not None
                or parts.password is not None or parts.port not in (None, 80, 443)
                or "." not in host or host.endswith((".local", ".localhost", ".internal", ".test"))):
            raise ValueError()
        try:
            addresses = [ipaddress.ip_address(host)]
        except ValueError:
            if re.fullmatch(r"[\d.]+", host):
                raise ValueError()
            addresses = [ipaddress.ip_address(row[4][0]) for row in socket.getaddrinfo(host, None)] if resolve else []
        if any(not address.is_global for address in addresses):
            raise ValueError()
        if resolve and not addresses:
            raise ValueError()
    except (ValueError, OSError):
        raise ApiError(422, "unsafe_url", "Gunakan URL HTTP/HTTPS publik tanpa kredensial atau alamat jaringan internal.") from None
    return value


def no_secrets(value):
    if re.search(r"(?i)(-----BEGIN|\bbearer\s|\b(password|passwd|api[_-]?key|access[_-]?token|secret)\s*[:=])", value):
        raise ApiError(422, "secret_not_allowed", "Simpan kredensial di password manager; ERP hanya menerima rujukan.")
    return value


def money(value):
    from decimal import Decimal, InvalidOperation
    try:
        amount = Decimal(value)
        if not amount.is_finite() or amount < 0 or amount > Decimal("9999999999999999999") or amount != amount.to_integral_value():
            raise ValueError()
    except (InvalidOperation, ValueError, TypeError):
        raise ApiError(422, "invalid_amount", "Nilai rupiah harus bilangan bulat tidak negatif.") from None
    return amount
