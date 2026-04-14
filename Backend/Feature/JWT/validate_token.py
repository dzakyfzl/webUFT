from .main import decode_token
from fastapi import Header, HTTPException, status, Depends
from Database.database import get_db
from sqlalchemy.orm import Session

async def verify_is_guest(authorization: str = Header(None)):
    """
    Memastikan request TIDAK memiliki token valid (Hanya untuk Yang Perama kali mengisi form untuk acara ini).
    """
    if authorization is not None:
        try:
            token = authorization.split(" ")[1] if " " in authorization else authorization
            get_db()
            payload = decode_token(token)
            return token
        except Exception:
            pass
    
    return "Baru"

def isAdmin(token: str) -> bool:
    """
        Validate the token (Refresh and Access)
    """
    payload = decode_token(token)
    if payload is None or payload.get("role") != "Admin":
        return False
    return True

def isUser(token: str) -> bool:
    """
        Validate the token (Refresh and Access)
    """
    payload = decode_token(token)
    if payload is None or payload.get("role") != "Admin":
        return False
    return True

def validate_token(token: str) -> dict:
    """
        Validate the token (Refresh and Access)
    """
    payload = decode_token(token)
    if payload is None:
        raise Exception("Invalid token")
    return payload