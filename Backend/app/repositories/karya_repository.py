from sqlalchemy import delete, select

from app.models import Acara, File, Karya, Pilihan, Responden
from app.repositories.base import BaseRepository


class KaryaRepository(BaseRepository):
    def get_public(self, acara_id: int, karya_id: int):
        stmt = select(Karya).where(Karya.karyaID == karya_id and Karya.acaraID == acara_id and Acara.status == "Aktif").join(Acara, Acara.acaraID == Karya.acaraID)
        return self.db.execute(stmt).scalar_one_or_none()

    def get(self, karya_id: int):
        return self.db.execute(select(Karya).where(Karya.karyaID == karya_id)).scalar_one_or_none()

    def create(self, **values):
        entity = Karya(**values)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def update_entity(self, entity, **values):
        for key, value in values.items():
            setattr(entity, key, value)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete_relations_and_karya(self, entity):
        self.db.execute(delete(Pilihan).where(Pilihan.karyaID == entity.karyaID))
        self.db.execute(delete(Responden).where(Responden.acaraID == entity.acaraID))
        self.db.execute(delete(Karya).where(Karya.karyaID == entity.karyaID))
        self.db.commit()

    def file_path(self, file_id: int):
        return self.db.execute(select(File.direktori).where(File.fileID == file_id)).scalar_one_or_none()

    def delete_file(self, file_id: int):
        self.db.execute(delete(File).where(File.fileID == file_id))
        self.db.commit()

    def list(self, acara_id: int):
        return self.db.execute(select(Karya).where(Karya.acaraID == acara_id)).scalars().all()
