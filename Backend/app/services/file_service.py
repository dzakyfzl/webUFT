import os
import shutil
import time

from app.repositories.file_repository import FileRepository
from app.services.result import ServiceResult
from app.utils.image_processing import converting_to_webp


class FileService:
    def __init__(self, repository: FileRepository):
        self.repository = repository

    def get(self, file_id: int):
        try:
            entity = self.repository.get(file_id)
            if entity is None:
                return ServiceResult({"message": "File not found"}, 404)
            return ServiceResult(entity)
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    async def upload(self, upload, user: dict):
        if user.get("role") != "Admin":
            return ServiceResult({"message": "Unauthorized"}, 403)
        if not upload.content_type.startswith("image/"):
            return ServiceResult({"message": "Only image files are allowed"}, 400)
        try:
            upload.filename = "UFT_IMAGE_" + str(int(time.time()))
            filepath = os.path.join("/media", upload.filename)
            try:
                with open(filepath, "wb+") as file_object:
                    shutil.copyfileobj(upload.file, file_object)
            except Exception as exc:
                print("ERROR : ", exc)
                return ServiceResult({"message": "There was an error uploading the file"}, 500)
            finally:
                await upload.close()
            new_filepath = converting_to_webp(filepath)
            entity = self.repository.create(nama=new_filepath[8:], direktori=new_filepath, jenis="image/webp", ukuran=os.path.getsize(new_filepath))
            return ServiceResult({"message": "File uploaded successfully", "file_id": entity.fileID})
        except Exception as exc:
            print(f"Error uploading file: {exc}")
            return ServiceResult({"message": "Error uploading file"})

    def delete(self, file_id: int, user: dict):
        if user.get("role") != "Admin":
            return ServiceResult({"message": "Unauthorized"}, 403)
        try:
            entity = self.repository.get(file_id)
            if entity is None:
                return ServiceResult({"message": "File not found"}, 404)
            try:
                os.remove(entity.direktori)
            except Exception as exc:
                print(f"Error deleting file from system: {exc}")
                return ServiceResult({"message": "Error deleting file from system"}, 500)
            self.repository.delete_entity(entity)
            return ServiceResult({"message": "File deleted successfully"})
        except Exception as exc:
            print(f"Error deleting file: {exc}")
            return ServiceResult({"message": "Error deleting file"})

    async def delete_internal_legacy(self, file_id: int):
        # Preserve the old helper's NameError before its first database query.
        try:
            raise NameError("name 'File' is not defined")
        except Exception as exc:
            print(f"Database error: {exc}")
            return {"message": "Database error"}
