from typing import Annotated
import os

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, insert, update
from Database.database import SessionLocal, get_db
from Database.models import Acara, Token
from Feature.JWT.validate_token import validate_token
from sqlalchemy.orm import Session
from pydantic import BaseModel
from fastapi.responses import Response
from dotenv import load_dotenv
from Feature.JWT.main import create_access_token, create_refresh_token, decode_token

load_dotenv()


router = APIRouter(
    prefix="/akun",
    tags=["Akun"]
)

class AkunCreate(BaseModel):
    username: str
    password: str
@router.post("/login")
def login(akun: AkunCreate, response: Response, db: Session = Depends(get_db)):
    if akun.username == os.getenv("ADMIN_USERNAME") and akun.password == os.getenv("ADMIN_PASSWORD"):  
        response.status_code = 200
        return {"message": "Login successful", "refresh_token": create_refresh_token(akun.username,"Admin"), "access_token": create_access_token(akun.username,"Admin")}
    else:
        response.status_code = 401
        return {"message": "Invalid credentials"}

class LogoutRequest(BaseModel):
    refresh_token: str
@router.post("/logout")
def logout(request:LogoutRequest, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin":
        response.status_code = 403
        return {"message": "Unauthorized"}
    try:
        stmt = select(Token).where(Token.tokenID == request.refresh_token)
        result = db.execute(stmt).scalar_one_or_none()
        if result is None:
            response.status_code = 401
            return {"message": "Invalid refresh token"}
        db.delete(result)
        db.commit()
        response.status_code = 200
        return {"message": "Logout successful"}
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()


@router.get("/refresh-token")
def refresh_token(refresh_token: str, response: Response, db: Session = Depends(get_db)):
    try:
        stmt = select(Token).where(Token.tokenID == refresh_token)
        result = db.execute(stmt).scalar_one_or_none()
        if result is None:
            response.status_code = 401
            return {"message": "Invalid refresh token"}
    except Exception as e:
        response.status_code = 500
        print(f"Database error: {e}")
        return {"message": "Database error"}
    finally:
        db.close()
    payload = decode_token(refresh_token)
    username = payload.get("sub")
    role = payload.get("role")
    new_access_token = create_access_token(username, role)
    response.status_code = 200
    return {"access_token": new_access_token}

@router.get("/me")
def get_current_user(user: Annotated[str, Depends(validate_token)], response: Response):
    response.status_code = 200
    return {"username": user.get("username"), "role": user.get("role")}