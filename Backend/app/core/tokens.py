import os
import time
from datetime import datetime, timedelta, timezone

import authlib.jose
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "")
ACCESS_TOKEN_EXPIRE_MINUTE = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTE") or 15)
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS") or 7)
ALGORITHM = "HS256"


def decode_token(token: str) -> dict | None:
    try:
        return authlib.jose.jwt.decode(token, SECRET_KEY)
    except authlib.jose.JoseError:
        return None


def create_access_token(username: str, role: str, access: list) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTE)
    payload = {
        "sub": username,
        "iat": int(time.time()),
        "exp": int(expire.timestamp()),
        "role": role,
        "access": access,
        "type": "Access",
    }
    try:
        token = authlib.jose.jwt.encode({"alg": ALGORITHM}, payload, SECRET_KEY)
        return token.decode("utf-8")
    except authlib.jose.JoseError:
        return "Error"


def create_refresh_token(username: str, role: str, access: list) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": username,
        "iat": int(time.time()),
        "exp": int(expire.timestamp()),
        "role": role,
        "access": access,
        "type": "Refresh",
    }
    try:
        token = authlib.jose.jwt.encode({"alg": ALGORITHM}, payload, SECRET_KEY)
        return token.decode("utf-8")
    except authlib.jose.JoseError as exc:
        print("ERROR : ", exc)
        return "Error"

def create_guest_token(username: str, role: str, access: list, expire: datetime) -> str:
    payload = {
        "sub": username,
        "iat": int(time.time()),
        "exp": int(expire.timestamp()),
        "role": role,
        "access": access,
        "type": "Refresh",
    }
    try:
        token = authlib.jose.jwt.encode({"alg": ALGORITHM}, payload, SECRET_KEY)
        return token.decode("utf-8") if isinstance(token, bytes) else str(token)
    except authlib.jose.JoseError as exc:
        print("ERROR : ", exc)
        return "Error"

