import hashlib
import json
import os

from app.core.security import check_password_hash
from app.core.tokens import create_access_token, create_refresh_token, decode_token
from app.repositories.akun_repository import AkunRepository
from app.services.result import ServiceResult


class AkunService:
    def __init__(self, repository: AkunRepository):
        self.repository = repository

    def login(self, data):
        account = self.repository.get_by_username(data.username)
        if not account or not check_password_hash(account.hashed_password, data.password, account.salt):
            return ServiceResult({"message": "Invalid credentials"}, 401)
        access = self.repository.access_names(account.akunID)
        access_token = create_access_token(data.username, "Admin", access)
        refresh_token = create_refresh_token(data.username, "Admin", access)
        self.repository.store_login_token(account.akunID, refresh_token)
        return ServiceResult({"access_token": access_token, "refresh_token": refresh_token})

    def logout(self, refresh_token: str, user: dict):
        if user.get("role") != "Admin":
            return ServiceResult({"message": "Unauthorized"}, 403)
        try:
            token = self.repository.get_token(refresh_token)
            if token is None:
                return ServiceResult({"message": "Invalid refresh token"}, 401)
            self.repository.clear_and_delete_token(token)
            return ServiceResult({"message": "Logout successful"})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def refresh(self, refresh_token: str):
        try:
            decoded = decode_token(refresh_token)
            if self.repository.token_for_username(decoded.get("sub")) is None:
                return ServiceResult({"message": "Invalid refresh token"}, 401)
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)
        return ServiceResult({"access_token": create_access_token(decoded.get("sub"), decoded.get("role"), decoded.get("access"))})

    @staticmethod
    def me(user: dict):
        return ServiceResult({"username": user.get("username"), "role": user.get("role"), "access": user.get("access")})

    def create(self, data, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        if self.repository.get_by_username(data.username):
            return ServiceResult({"message": "Username already exists"}, 400)
        salt = os.urandom(32).hex()
        hashed = hashlib.sha256((data.password + salt).encode()).hexdigest()
        self.repository.create_account(data.username, hashed, salt)
        return ServiceResult({"message": "Akun created successfully"}, 201)

    def list(self, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        accounts = self.repository.list_accounts()
        result = [{"akunID": account.akunID, "username": account.username, "role": account.role, "bidang": [{"bidangID": bidang.bidangID, "nama": bidang.nama} for bidang in self.repository.access_for_account(account.akunID)]} for account in accounts]
        return ServiceResult({"akuns": result})

    def delete(self, akun_id: int, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        account = self.repository.get(akun_id)
        if not account:
            return ServiceResult({"message": "Akun not found"}, 404)
        try:
            self.repository.delete_account(account)
        except Exception:
            self.repository.rollback()
            return ServiceResult({"message": "Error occurred while deleting akun"}, 500)
        return ServiceResult({"message": "Akun deleted successfully"})

    def available_access(self, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        result = []
        with open("bidang.json", "r") as handle:
            for index, item in enumerate(json.load(handle), start=1):
                result.append({"bidangID": index, "nama": item["nama"]})
        return ServiceResult({"access": result})

    def add_access(self, akun_id: int, bidang_id: int, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        if self.repository.get_access(akun_id, bidang_id):
            return ServiceResult({"message": "Akses sudah ada untuk akun dan bidang ini"}, 400)
        self.repository.create_access(akun_id, bidang_id)
        return ServiceResult({"message": "Akses added successfully"}, 201)

    def remove_access(self, akun_id: int, bidang_id: int, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        access = self.repository.get_access(akun_id, bidang_id)
        if not access:
            return ServiceResult({"message": "Akses tidak ditemukan untuk akun dan bidang ini"}, 404)
        self.repository.delete_access(access)
        return ServiceResult({"message": "Akses deleted successfully"})

    @staticmethod
    def _authorize(user: dict):
        if user.get("role") != "Admin" or "Kelola Akun" not in user.get("access", []):
            return ServiceResult({"message": "Unauthorized"}, 403)
