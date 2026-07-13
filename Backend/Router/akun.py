import hashlib
from typing import Annotated
import os

from fastapi import APIRouter, Depends
from flask import json
from sqlalchemy import and_, delete, select, func, insert, update
from Feature.security.main import check_password_hash
from Database.database import SessionLocal, get_db
from Database.models import Acara, Akses, Akun, Bidang, Token
from Feature.JWT.validate_token import validate_refresh_token, validate_token
from sqlalchemy.orm import Session
from pydantic import BaseModel
from fastapi.responses import Response
from dotenv import load_dotenv
from Feature.JWT.main import create_access_token, create_refresh_token, decode_token



router = APIRouter(
    prefix="/akun",
    tags=["Akun"]
)

class AkunCreate(BaseModel):
    username: str
    password: str
@router.post("/login")
def login(akun: AkunCreate, response: Response, db: Session = Depends(get_db)):
    akun_db = db.execute(select(Akun).where(Akun.username == akun.username)).scalar_one_or_none()
    if not akun_db or not check_password_hash(akun_db.hashed_password, akun.password, akun_db.salt):
        response.status_code = 401
        return {"message": "Invalid credentials"}
    else:
        bidang_names = [row[0] for row in db.execute(select(Bidang.nama).join(Akses, Bidang.bidangID == Akses.bidangID).where(Akses.akunID == akun_db.akunID)).all()]
        access_token = create_access_token(akun.username, "Admin", bidang_names)
        refresh_token = create_refresh_token(akun.username, "Admin", bidang_names)
        new_token = Token(tokenID=refresh_token)
        db.add(new_token)
        db.commit()
        db.execute(update(Akun).where(Akun.akunID == akun_db.akunID).values(tokenID=refresh_token))
        db.commit()
        response.status_code = 200
        return {"access_token": access_token, "refresh_token": refresh_token}

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
        db.execute(update(Akun).where(Akun.tokenID == result.tokenID).values(tokenID=None))
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


@router.get("/access-token")
def refresh_token(refresh_token: Annotated[str, Depends(validate_refresh_token)], response: Response, db: Session = Depends(get_db)):
    try:
        decoded_token = decode_token(refresh_token)
        stmt = select(Akun.tokenID).where(Akun.username == decoded_token.get("sub"))
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
    new_access_token = create_access_token(decoded_token.get("sub"), decoded_token.get("role"), decoded_token.get("access"))
    response.status_code = 200
    return {"access_token": new_access_token}

@router.get("/me")
def get_current_user(user: Annotated[str, Depends(validate_token)], response: Response):
    response.status_code = 200
    return {"username": user.get("username"), "role": user.get("role"), "access": user.get("access")}

## Zona Administrasi Akun

@router.post("/tambah")
def tambah_akun(akun: AkunCreate, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin" or "Kelola Akun" not in user.get("access", []):
        response.status_code = 403
        return {"message": "Unauthorized"}

    existing_akun = db.execute(select(Akun).where(Akun.username == akun.username)).scalar_one_or_none()
    if existing_akun:
        response.status_code = 400
        return {"message": "Username already exists"}
    salt = os.urandom(32).hex() 
    hashed_password = hashlib.sha256((akun.password + salt).encode()).hexdigest()
    new_akun = Akun(username=akun.username, hashed_password=hashed_password, salt=salt, role="Admin")
    db.add(new_akun)
    db.commit()
    response.status_code = 201
    return {"message": "Akun created successfully"}

@router.get("/list")
def list_akun(response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin" or "Kelola Akun" not in user.get("access", []):
        response.status_code = 403
        return {"message": "Unauthorized"}

    akuns = db.execute(select(Akun.akunID, Akun.username, Akun.role)).all()
    akun_list = [{"akunID": akun.akunID, "username": akun.username, "role": akun.role, "bidang": [{"bidangID": bidang.bidangID, "nama": bidang.nama} for bidang in db.execute(select(Bidang.nama, Bidang.bidangID).join(Akses, Bidang.bidangID == Akses.bidangID).where(Akses.akunID == akun.akunID)).all()]} for akun in akuns]
    response.status_code = 200
    return {"akuns": akun_list}

@router.delete("/hapus/{akun_id}")
def hapus_akun(akun_id: int, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin" or "Kelola Akun" not in user.get("access", []):
        response.status_code = 403
        return {"message": "Unauthorized"}

    akun_to_delete = db.execute(select(Akun).where(Akun.akunID == akun_id)).scalar_one_or_none()
    if not akun_to_delete:
        response.status_code = 404
        return {"message": "Akun not found"}
    try:
        db.execute(delete(Akses).where(Akses.akunID == akun_id))
        db.commit()
        db.delete(akun_to_delete)
        db.commit()
    except Exception as e:
        db.rollback()
        response.status_code = 500
        return {"message": "Error occurred while deleting akun"}
    finally:
        db.close()
    response.status_code = 200
    return {"message": "Akun deleted successfully"}

@router.get("/akses")
def get_user_access(user: Annotated[str, Depends(validate_token)], response: Response, db: Session = Depends(get_db)):
    if user.get("role") != "Admin" or "Kelola Akun" not in user.get("access", []):
        response.status_code = 403
        return {"message": "Unauthorized"}

    access_list = []
    with open("bidang.json", "r") as f:
            bidang_data = json.load(f)
            i = 1
            for item in bidang_data:
                access_list.append({"bidangID": i, "nama": item["nama"]})
                i += 1
    response.status_code = 200
    return {"access": access_list}

@router.post("/tambah-akses/{akun_id}/{bidang_id}")
def tambah_akses(akun_id: int, bidang_id: int, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin" or "Kelola Akun" not in user.get("access", []):
        response.status_code = 403
        return {"message": "Unauthorized"}

    existing_akses = db.execute(select(Akses).where(and_(Akses.akunID == akun_id, Akses.bidangID == bidang_id))).scalar_one_or_none()
    if existing_akses:
        response.status_code = 400
        return {"message": "Akses sudah ada untuk akun dan bidang ini"}
    new_akses = Akses(akunID=akun_id, bidangID=bidang_id)
    db.add(new_akses)
    db.commit()
    response.status_code = 201
    return {"message": "Akses added successfully"}

@router.delete("/hapus-akses/{akun_id}/{bidang_id}")
def hapus_akses(akun_id: int, bidang_id: int, response: Response, user: Annotated[str, Depends(validate_token)], db: Session = Depends(get_db)):
    if user.get("role") != "Admin" or "Kelola Akun" not in user.get("access", []):
        response.status_code = 403
        return {"message": "Unauthorized"}

    existing_akses = db.execute(select(Akses).where(and_(Akses.akunID == akun_id, Akses.bidangID == bidang_id))).scalar_one_or_none()
    if not existing_akses:
        response.status_code = 404
        return {"message": "Akses tidak ditemukan untuk akun dan bidang ini"}
    db.delete(existing_akses)
    db.commit()
    response.status_code = 200
    return {"message": "Akses deleted successfully"}