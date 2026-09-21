import os

from app.repositories.file_repository import FileRepository
from app.repositories.partner_repository import PartnerRepository
from app.services.result import ServiceResult


class PartnerService:
    def __init__(self, repository: PartnerRepository, file_repository: FileRepository):
        self.repository = repository
        self.file_repository = file_repository

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    def getAll(self, only_active: bool = False):
        try:
            return ServiceResult(self.repository.getAll(only_active=only_active))
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def get(self, partner_id: int):
        try:
            entity = self.repository.get(partner_id)
            if entity is None:
                return ServiceResult({"message": "Partner not found"}, 404)
            return ServiceResult({
                "partnerID": entity.partnerID,
                "fileID": entity.fileID,
                "label": entity.label,
                "judul": entity.judul,
                "deskripsi": entity.deskripsi,
                "kategori": entity.kategori,
                "urutan": entity.urutan,
                "is_active": entity.is_active,
            })
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    # ------------------------------------------------------------------
    # Protected (admin)
    # ------------------------------------------------------------------

    def create(self, data, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            entity = self.repository.create(data)
            return ServiceResult({"message": "Partner added successfully", "partner_id": entity.partnerID})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def update(self, partner_id: int, data, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            entity = self.repository.get(partner_id)
            if entity is None:
                return ServiceResult({"message": "Partner not found"}, 404)
            self.repository.update(entity, data)
            return ServiceResult({"message": "Partner updated successfully"})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def toggle(self, partner_id: int, is_active: bool, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            if self.repository.toggle(partner_id, is_active) == 0:
                return ServiceResult({"message": "Partner not found"}, 404)
            return ServiceResult({"message": "Partner updated successfully", "is_active": is_active})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    async def delete(self, partner_id: int, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            file_id = self.repository.file_id(partner_id)
            if self.repository.delete(partner_id) == 0:
                return ServiceResult({"message": "Partner not found"}, 404)
            # Best-effort: delete the associated file if it exists
            if file_id is not None:
                file_entity = self.file_repository.get(file_id)
                if file_entity is not None:
                    try:
                        os.remove(file_entity.direktori)
                    except Exception as exc:
                        print(f"Warning: could not delete file from disk: {exc}")
                    self.file_repository.delete_entity(file_entity)
            return ServiceResult({"message": "Partner deleted successfully"})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    # ------------------------------------------------------------------

    @staticmethod
    def _authorize(user: dict):
        if user.get("role") != "Admin" or "Kelola Partner" not in user.get("access", []):
            return ServiceResult({"message": "Unauthorized"}, 403)
