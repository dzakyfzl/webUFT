import os
import shutil
import zipfile
import tempfile
from datetime import datetime
from fastapi import UploadFile
from sqlalchemy import select
from app.repositories.migrate_repository import MigrateRepository
from app.repositories.file_repository import FileRepository
from app.services.result import ServiceResult
from app.models import File

class MigrateService:
    def __init__(self, repository: MigrateRepository, file_repository: FileRepository):
        self.repository = repository
        self.file_repository = file_repository
        self.media_dir = "/media"

    @staticmethod
    def _authorize(user: dict):
            print("auth pass")
            if user.get("role") != "Admin" or "Kelola Migrasi" not in user.get("access", []):
                return ServiceResult({"message": "Unauthorized"}, 403)

    @staticmethod
    def _get(callback):
        try:
            entity = callback()
            return ServiceResult(entity if entity is not None else {"message": "Migration not found"}, 200 if entity is not None else 404)
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def exportData(self, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        
        # Hilangkan microsecond agar sesuai dengan format nama file
        timestamp = datetime.now().replace(microsecond=0)
        timestamp_str = timestamp.strftime("%Y%m%d%H%M%S")
        
        temp_dir = tempfile.gettempdir()
        zip_filename = f"{timestamp_str}.zip"
        zip_filepath = os.path.join(temp_dir, zip_filename)
        
        try:
            with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
                if os.path.exists(self.media_dir):
                    for root, dirs, files in os.walk(self.media_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, self.media_dir)
                            zipf.write(file_path, arcname)
                            
            username = user.get("username", "Unknown")
            print(timestamp_str)
            print(timestamp)
            self.repository.create_export(exported_at=timestamp, exporter_username=username)
            
            return ServiceResult({"message": "Export created", "filepath": zip_filepath, "filename": zip_filename})
        except Exception as exc:
            print(f"Error exporting: {exc}")
            return ServiceResult({"message": "Error exporting media"}, 500)

    async def importData(self, upload: UploadFile, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
            
        filename = upload.filename
        if not filename.endswith('.zip'):
            return ServiceResult({"message": "Must be a zip file"}, 400)
            
        try:
            timestamp_str = filename.replace('.zip', '')
            timestamp = datetime.strptime(timestamp_str, "%Y%m%d%H%M%S")
        except Exception:
            return ServiceResult({"message": "Invalid timestamp in filename"}, 400)

        print(timestamp_str)
        print(timestamp)
        entity = self.repository.get_by_exported_at(timestamp)
        if not entity:
            return ServiceResult({"message": "No matching export found in database"}, 404)
            
        temp_dir = tempfile.gettempdir()
        zip_filepath = os.path.join(temp_dir, f"upload_{filename}")
        
        try:
            with open(zip_filepath, "wb+") as f:
                shutil.copyfileobj(upload.file, f)
                
            db = self.file_repository.db
            all_files_query = db.execute(select(File.direktori)).scalars().all()
            # keep just the filename part from db records for easy matching
            valid_filenames = set([os.path.basename(p) for p in all_files_query])
            
            with zipfile.ZipFile(zip_filepath, 'r') as zipf:
                zip_contents = zipf.namelist()
                
                if not os.path.exists(self.media_dir):
                    os.makedirs(self.media_dir)
                    
                for item in zip_contents:
                    if not item.endswith('/'):
                        base_name = os.path.basename(item)
                        # Hanya ekstrak file jika ada di database
                        if base_name in valid_filenames:
                            zipf.extract(item, self.media_dir)
                        else:
                            # Abaikan file (seolah dihapus dari zip)
                            print(f"Mengabaikan file {base_name}: tidak ditemukan di database.")

                
            username = user.get("username", "Unknown")
            self.repository.update_import(entity, datetime.now(), username)
            
            return ServiceResult({"message": "Import successful"})
        except Exception as exc:
            print(f"Error importing: {exc}")
            return ServiceResult({"message": "Error importing media"}, 500)
        finally:
            if os.path.exists(zip_filepath):
                os.remove(zip_filepath)
            await upload.close()

    async def get(self, user: dict, id: int = 0):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            migrate_history = self.repository.get(id)
            return ServiceResult(migrate_history)
        except Exception as e:
            print(f"Error retrieving {e}");
            return ServiceResult({"message": "Error getting migrate history data"}, 500)
