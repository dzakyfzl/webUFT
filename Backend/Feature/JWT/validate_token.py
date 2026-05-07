import time

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

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
    if payload is None or payload.get("role") != "User":
        return False
    return True

# Inisialisasi skema HTTPBearer
security = HTTPBearer()

def validate_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Fungsi ini otomatis mencari header: 'Authorization: Bearer <token>'
    """
    # credentials.credentials berisi string token JWT yang sudah dipotong dari kata "Bearer "
    token = credentials.credentials
    
    try:
        # Panggil fungsi decode kamu
        payload = decode_token(token) 
        
        # Ekstrak data yang dibutuhkan
        username = payload.get("sub")
        role = payload.get("role")
        created_at = payload.get("iat")
        expired_at = payload.get("exp")
        current_time = int(time.time())
        
        if not username or current_time > expired_at:
            raise HTTPException(status_code=401, detail="Token tidak valid: Data token tidak lengkap")
            
        return {"username": username, "role": role}
        
    except Exception as e:
        # Tangkap error jika token expired atau signature tidak cocok
        raise HTTPException(
            status_code=401, 
            detail="Token otorisasi tidak valid atau sudah kedaluwarsa"
        )

def validate_refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Fungsi ini otomatis mencari header: 'Authorization: Bearer <token>'
    """
    # credentials.credentials berisi string token JWT yang sudah dipotong dari kata "Bearer "
    token = credentials.credentials
    
    try:
        # Panggil fungsi decode kamu
        payload = decode_token(token) 
        
        # Ekstrak data yang dibutuhkan
        username = payload.get("sub")
        role = payload.get("role")
        created_at = payload.get("iat")
        expired_at = payload.get("exp")
        current_time = int(time.time())
        
        if not username or current_time > expired_at:
            raise HTTPException(status_code=401, detail="Token tidak valid: Data token tidak lengkap")
            
        return token
        
    except Exception as e:
        # Tangkap error jika token expired atau signature tidak cocok
        raise HTTPException(
            status_code=401, 
            detail="Token otorisasi tidak valid atau sudah kedaluwarsa"
        )