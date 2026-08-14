import os

from app.repositories.acara_repository import AcaraRepository
from app.schemas.acara import AcaraCreate
from app.services.result import ServiceResult


class AcaraService:
    def __init__(self, repository: AcaraRepository):
        self.repository = repository

    def get_public(self, acara_id: int):
        try:
            entity = self.repository.get_public(acara_id)
            return ServiceResult(entity if entity is not None else {"message": "Acara not found"}, 200 if entity is not None else 404)
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def get_admin(self, acara_id: int, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            entity = self.repository.get(acara_id)
            return ServiceResult(entity if entity is not None else {"message": "Acara not found"}, 200 if entity is not None else 404)
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def create(self, data: AcaraCreate, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        entity = self.repository.create(nama=data.nama, deskripsi=data.deskripsi, tempat=data.tempat, waktu=data.waktu, fileID=data.fileID, status=data.status)
        return ServiceResult(entity)

    def update(self, acara_id: int, data: AcaraCreate, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            if self.repository.get(acara_id) is None:
                return ServiceResult({"message": "Acara not found"}, 404)
            self.repository.update(acara_id, nama=data.nama, deskripsi=data.deskripsi, tempat=data.tempat, waktu=data.waktu, fileID=data.fileID, status=data.status)
            return ServiceResult({"message": "Acara updated successfully"})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def delete(self, acara_id: int, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            acara = self.repository.get(acara_id)
            if acara is None:
                return ServiceResult({"message": "Acara not found"}, 404)
            acara_file_id = acara.fileID
            karya_paths = self.repository.karya_paths(acara_id)
            karya_file_ids = self.repository.karya_file_ids(acara_id)
            self.repository.delete_pilihan(acara_id)
            self.repository.delete_respondens(acara_id)
            self.repository.delete_karyas(acara_id)
            self.repository.delete_acara(acara_id)
            valid_file_ids = [file_id for file_id in karya_file_ids if file_id is not None]
            if valid_file_ids:
                self.repository.delete_files(valid_file_ids)
            acara_path = None
            if acara_file_id:
                acara_path = self.repository.file_path(acara_file_id)
                self.repository.delete_file(acara_file_id)
            self.repository.commit()
            for path in karya_paths:
                self._remove_with_warning(path, "karya")
            self._remove_with_warning(acara_path, "acara")
            return ServiceResult({"message": "Acara deleted successfully"})
        except Exception as exc:
            self.repository.rollback()
            print(f"Database error: {exc}")
            return ServiceResult({"message": f"Database error: {str(exc)}"}, 500)

    def list_public(self):
        return self._list(self.repository.list_public)

    def list_all(self, user: dict):
        denied = self._authorize(user)
        return denied or self._list(self.repository.list_all)

    @staticmethod
    def _authorize(user: dict):
        if user.get("role") != "Admin" or "Kelola Acara" not in user.get("access", []):
            return ServiceResult({"message": "Unauthorized"}, 403)

    @staticmethod
    def _remove_with_warning(path, label):
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except Exception as exc:
                print(f"Peringatan: Gagal menghapus file {label} {path}. Detail: {exc}")

    @staticmethod
    def _list(callback):
        try:
            return ServiceResult(callback())
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)
