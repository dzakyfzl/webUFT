"""Fail-closed runtime configuration, without loading or logging .env files."""

from dataclasses import dataclass, field
from typing import Mapping
from urllib.parse import urlsplit


class ConfigurationError(ValueError):
    """Messages contain setting names only, never their sensitive values."""


def _integer(env: Mapping[str, str], name: str, default: int, minimum: int,
             maximum: int) -> int:
    try:
        value = int(env.get(name, str(default)))
    except (ValueError, TypeError):
        raise ConfigurationError(f"{name} must be an integer") from None
    if not minimum <= value <= maximum:
        raise ConfigurationError(f"{name} is outside the supported range")
    return value


def _origin(value: str, production: bool) -> str:
    if any(character.isspace() or ord(character) < 32 for character in value):
        raise ConfigurationError("ERP_PUBLIC_ORIGIN must not contain whitespace or control characters")
    try:
        parts = urlsplit(value)
        valid = (parts.scheme in ("http", "https") and parts.hostname
                 and parts.path in ("", "/") and not parts.query and not parts.fragment
                 and parts.username is None and parts.password is None)
        # Access the parsed port to reject malformed ports and values >65535.
        valid = valid and (parts.port is None or parts.port > 0)
        if production:
            valid = valid and parts.scheme == "https"
    except ValueError:
        valid = False
    if not valid:
        raise ConfigurationError("ERP_PUBLIC_ORIGIN must be a valid HTTP origin (HTTPS in production)")
    return f"{parts.scheme}://{parts.netloc.lower()}"


@dataclass(frozen=True)
class Settings:
    database_url: str = field(repr=False)
    environment: str
    public_origin: str
    session_ttl_seconds: int
    login_max_attempts: int
    login_window_seconds: int
    pool_size: int
    pool_max_overflow: int
    media_dir: str = "var/media"

    @property
    def secure_cookie(self) -> bool:
        return self.public_origin.startswith("https://")

    @classmethod
    def from_environment(cls, env: Mapping[str, str]) -> "Settings":
        environment = env.get("ERP_ENV", "development")
        if environment not in ("development", "test", "production"):
            raise ConfigurationError("ERP_ENV must be development, test or production")
        database_url = env.get("DATABASE_URL", "")
        if not database_url:
            raise ConfigurationError("DATABASE_URL is required; no fallback database is available")
        try:
            parts = urlsplit(database_url)
            valid = (parts.scheme == "postgresql+psycopg" and parts.hostname
                     and parts.path not in ("", "/") and not parts.fragment
                     and (parts.port is None or parts.port > 0))
        except ValueError:
            valid = False
        if not valid:
            raise ConfigurationError("DATABASE_URL must identify a PostgreSQL database using psycopg")
        origin = env.get("ERP_PUBLIC_ORIGIN", "")
        if not origin:
            if environment == "production":
                raise ConfigurationError("ERP_PUBLIC_ORIGIN is required in production")
            origin = "http://localhost:3000"
        return cls(
            database_url=database_url,
            environment=environment,
            public_origin=_origin(origin, environment == "production"),
            session_ttl_seconds=_integer(env, "ERP_SESSION_TTL_SECONDS", 43200, 300, 604800),
            login_max_attempts=_integer(env, "ERP_LOGIN_MAX_ATTEMPTS", 5, 1, 100),
            login_window_seconds=_integer(env, "ERP_LOGIN_WINDOW_SECONDS", 900, 1, 86400),
            pool_size=_integer(env, "ERP_DB_POOL_SIZE", 3, 1, 10),
            pool_max_overflow=_integer(env, "ERP_DB_MAX_OVERFLOW", 2, 0, 10),
            media_dir=env.get("ERP_MEDIA_DIR") or "var/media",
        )
