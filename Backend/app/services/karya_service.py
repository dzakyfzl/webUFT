import os

from app.repositories.karya_repository import KaryaRepository
from app.services.result import ServiceResult


class KaryaService:
    def __init__(self, repository: KaryaRepository):
        self.repository = repository

    def get_public(self, acara_id: int, karya_id: int):
        try:
            entity = self.repository.get_public(acara_id, karya_id)
            return ServiceResult(entity if entity is not None else {"message": "Karya not found"}, 200 if entity is not None else 404)
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def create(self, data, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            entity = self.repository.create(nama=data.nama, deskripsi=data.deskripsi, pemilik=data.pemilik, acaraID=data.acaraID, fileID=data.fileID)
            return ServiceResult(entity)
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def update(self, karya_id: int, data, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            entity = self.repository.get(karya_id)
            if entity is None:
                return ServiceResult({"message": "Karya not found"}, 404)
            return ServiceResult(self.repository.update_entity(entity, nama=data.nama, deskripsi=data.deskripsi, pemilik=data.pemilik, acaraID=data.acaraID, fileID=data.fileID))
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def delete(self, karya_id: int, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            entity = self.repository.get(karya_id)
            if entity is None:
                return ServiceResult({"message": "Karya not found"}, 404)
            file_id = entity.fileID
            self.repository.delete_relations_and_karya(entity)
            if file_id:
                path = self.repository.file_path(file_id)
                self.repository.delete_file(file_id)
                if path and os.path.exists(path):
                    os.remove(path)
            return ServiceResult({"message": "Karya deleted successfully"})
        except Exception as exc:
            self.repository.rollback()
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def list(self, acara_id: int):
        try:
            return ServiceResult(self.repository.list(acara_id))
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    @staticmethod
    def _authorize(user: dict):
        if user.get("role") != "Admin" or "Kelola Acara" not in user.get("access", []):
            return ServiceResult({"message": "Unauthorized"}, 403)
