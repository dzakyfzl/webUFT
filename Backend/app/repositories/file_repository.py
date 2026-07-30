from sqlalchemy import delete, select

from app.models import File
from app.repositories.base import BaseRepository


class FileRepository(BaseRepository):
    def get(self, file_id: int):
        return self.db.execute(select(File).where(File.fileID == file_id)).scalar_one_or_none()

    def get_path(self, file_id: int):
        return self.db.execute(select(File.direktori).where(File.fileID == file_id)).scalar_one_or_none()

    def create(self, **values):
        entity = File(**values)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete_entity(self, entity):
        self.db.delete(entity)
        self.db.commit()

    def delete_by_id(self, file_id: int):
        result = self.db.execute(delete(File).where(File.fileID == file_id))
        self.db.commit()
        return result.rowcount
