from app.repositories.album_repository import AlbumRepository
from app.services.file_service import FileService
from app.services.result import ServiceResult


class AlbumService:
    def __init__(self, repository: AlbumRepository, file_service: FileService):
        self.repository = repository
        self.file_service = file_service

    async def create(self, data, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            entity = self.repository.create_with_legacy_status(data.nama, data.deskripsi)
            return ServiceResult({"message": "Album created successfully", "album_id": entity.albumID})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def update(self, album_id: int, data, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            if self.repository.update(album_id, data.nama, data.deskripsi) == 0:
                return ServiceResult({"message": "Album not found"}, 404)
            return ServiceResult({"message": "Album updated successfully"})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def get(self, album_id: int):
        return self._get(lambda: self.repository.get(album_id))

    def getAll(self):
        try:
            return ServiceResult(self.repository.getAll())
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    async def delete(self, album_id: int, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            for file_id in self.repository.foto_file_ids(album_id):
                await self.file_service.delete(file_id,user)
            self.repository.delete(album_id)
            return ServiceResult({"message": "Album deleted successfully"})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    @staticmethod
    def _authorize(user: dict):
        if user.get("role") != "Admin" or "Kelola Galeri" not in user.get("access", []):
            return ServiceResult({"message": "Unauthorized"}, 403)

    @staticmethod
    def _get(callback):
        try:
            entity = callback()
            return ServiceResult(entity if entity is not None else {"message": "Album not found"}, 200 if entity is not None else 404)
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)
