from sqlalchemy import select
from app.models.entities import LastMigrate
from app.repositories.base import BaseRepository
from datetime import datetime

class MigrateRepository(BaseRepository):
    def create_export(self, exported_at: datetime, exporter_username: str):
        entity = LastMigrate(exported_at=exported_at, exporter_username=exporter_username)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get_by_exported_at(self, exported_at: datetime):
        return self.db.execute(select(LastMigrate).where(LastMigrate.exported_at == exported_at)).scalar_one_or_none()

    def update_import(self, entity: LastMigrate, imported_at: datetime, importer_username: str):
        entity.imported_at = imported_at
        entity.importer_username = importer_username
        self.db.commit()
        self.db.refresh(entity)
        return entity
