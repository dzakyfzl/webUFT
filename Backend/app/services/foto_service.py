from app.repositories.foto_repository import FotoRepository
from app.services.file_service import FileService
from app.services.result import ServiceResult


class FotoService:
    def __init__(self, repository: FotoRepository, file_service: FileService):
        self.repository = repository
        self.file_service = file_service

    def create(self, album_id: int, data, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            entity = self.repository.create(album_id, data)
            return ServiceResult({"message": "Foto added successfully", "foto_id": entity.fotoID})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    async def delete(self, foto_id: int, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            file_id = self.repository.file_id(foto_id)
            if file_id is None:
                return ServiceResult({"message": "Foto not found"}, 404)
            await self.file_service.delete_internal_legacy(file_id)
            if self.repository.delete(foto_id) == 0:
                return ServiceResult({"message": "Foto not found"}, 404)
            return ServiceResult({"message": "Foto deleted successfully"})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def update(self, foto_id: int, data, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            entity = self.repository.get(foto_id)
            if entity is None:
                return ServiceResult({"message": "Foto not found"}, 404)
            self.repository.update(entity, data)
            return ServiceResult({"message": "Foto updated successfully"})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def get(self, foto_id: int):
        try:
            entity = self.repository.get(foto_id)
            return ServiceResult(entity if entity is not None else {"message": "Foto not found"}, 200 if entity is not None else 404)
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    @staticmethod
    def _authorize(user: dict):
        if user.get("role") != "Admin" or "Kelola Galeri" not in user.get("access", []):
            return ServiceResult({"message": "Unauthorized"}, 403)
