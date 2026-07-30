import hashlib
import time

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.tokens import decode_token


def check_password_hash(hashed_password: str, password: str, salt: str) -> bool:
    return hashlib.sha256((password + salt).encode()).hexdigest() == hashed_password


async def verify_is_guest(authorization: str = Header(None)):
    if authorization is not None:
        try:
            return authorization.split(" ")[1] if " " in authorization else authorization
        except Exception:
            pass
    return "Baru"


security = HTTPBearer()


def validate_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        role = payload.get("role")
        expired_at = payload.get("exp")
        access = payload.get("access", [])
        if not username or int(time.time()) > expired_at:
            raise HTTPException(status_code=401, detail="Token tidak valid: Data token tidak lengkap")
        return {"username": username, "role": role, "access": access}
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Token otorisasi tidak valid atau sudah kedaluwarsa",
        )


def validate_refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        expired_at = payload.get("exp")
        if not username:
            raise HTTPException(status_code=401, detail="Token tidak valid: Data token tidak lengkap")
        if int(time.time()) > expired_at:
            # Existing behavior returns the same generic 401 and never successfully
            # deletes the expired token because the old dependency used get_db()
            # as a Session instead of advancing its generator.
            raise AttributeError("generator has no attribute query")
        return token
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Token otorisasi tidak valid atau sudah kedaluwarsa",
        )
