from datetime import datetime, timedelta, timezone
from hashlib import sha256
from hmac import compare_digest
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.auth.models import LoginAttemptRow, SessionRow
from app.authorization import actor_snapshot, policy_snapshot
from app.errors import ApiError
from app.organization.models import UserRow


passwords = PasswordHasher()
# Equal-cost verification for unknown users; never a real account credential.
_dummy_hash = passwords.hash(secrets.token_urlsafe(32))
COOKIE = "uft_erp_session"


def digest(token: str) -> str:
    return sha256(token.encode()).hexdigest()


def authenticate(session: Session, token: str | None, *, require_active_board=True) -> tuple[UserRow, SessionRow]:
    if not token or len(token) > 200:
        raise ApiError(401, "unauthenticated", "Silakan masuk kembali.")
    stored = session.get(SessionRow, digest(token))
    now = datetime.now(timezone.utc)
    if stored is None or stored.expires_at <= now:
        raise ApiError(401, "unauthenticated", "Sesi berakhir. Silakan masuk kembali.")
    user = session.get(UserRow, stored.user_id, populate_existing=True)
    if user is None or not user.active or stored.session_version != user.session_version:
        raise ApiError(401, "unauthenticated", "Sesi tidak berlaku. Silakan masuk kembali.")
    actor = actor_snapshot(session, user.id)
    if require_active_board and not policy_snapshot(session).readable(actor):
        raise ApiError(403, "inactive_board", "Keanggotaan pengurus aktif diperlukan.")
    return user, stored


def csrf_check(request, settings, stored: SessionRow | None = None):
    if request.headers.get("origin") != settings.public_origin:
        raise ApiError(403, "csrf", "Asal permintaan tidak diizinkan.")
    if stored is not None and not compare_digest(
            request.headers.get("x-csrf-token", ""), stored.csrf_token):
        raise ApiError(403, "csrf", "Sesi berubah. Muat ulang halaman lalu coba kembali.")


def login(session: Session, settings, username: str, password: str, client_ip: str):
    """Return an error instead of raising so failed-attempt counters commit."""
    now = datetime.now(timezone.utc)
    # Check the shared IP bucket before creating a username bucket. Requests
    # already limited by IP must not create unlimited rows for invented users.
    keys = (digest("ip:" + client_ip), digest("user:" + username))
    attempts = []
    for key in keys:
        # An absent row must also serialize concurrent attempts.
        lock_key = int(key[:15], 16)
        session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock_key})
        session.execute(insert(LoginAttemptRow).values(
            key_hash=key, attempts=0, window_started_at=now).on_conflict_do_nothing())
        row = session.get(LoginAttemptRow, key, populate_existing=True)
        if (now - row.window_started_at).total_seconds() >= settings.login_window_seconds:
            row.attempts = 0
            row.window_started_at = now
        attempts.append(row)
        if row.attempts >= settings.login_max_attempts:
            return None, ApiError(429, "rate_limited", "Terlalu banyak percobaan. Coba kembali nanti.")
    user = session.scalar(select(UserRow).where(UserRow.username == username))
    try:
        valid = passwords.verify(user.password_hash if user else _dummy_hash, password)
    except (VerificationError, InvalidHashError):
        valid = False
    if not valid or user is None or not user.active:
        for row in attempts:
            row.attempts += 1
        return None, ApiError(401, "invalid_credentials", "Username atau password tidak sesuai.")
    actor = actor_snapshot(session, user.id)
    if not policy_snapshot(session).readable(actor):
        return None, ApiError(403, "inactive_board", "Keanggotaan pengurus aktif diperlukan.")
    for row in attempts:
        row.attempts = 0
    if passwords.check_needs_rehash(user.password_hash):
        user.password_hash = passwords.hash(password)
    token = secrets.token_urlsafe(48)
    stored = SessionRow(token_hash=digest(token), user_id=user.id,
                        csrf_token=secrets.token_urlsafe(32), session_version=user.session_version,
                        expires_at=now + timedelta(seconds=settings.session_ttl_seconds))
    session.add(stored)
    return (token, stored), None
