import os
import time
from datetime import datetime, timedelta, timezone

import authlib.jose
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ACCESS_TOKEN_EXPIRE_MINUTE = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTE")
REFRESH_TOKEN_EXPIRE_DAYS = os.getenv("REFRESH_TOKEN_EXPIRE_DAYS")
ALGORITHM = "HS256"


def decode_token(token: str) -> dict | None:
    try:
        return authlib.jose.jwt.decode(token, SECRET_KEY)
    except authlib.jose.JoseError:
        return None


def create_access_token(username: str, role: str, access: list) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=int(ACCESS_TOKEN_EXPIRE_MINUTE))
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
    expire = datetime.now(timezone.utc) + timedelta(days=int(REFRESH_TOKEN_EXPIRE_DAYS))
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
