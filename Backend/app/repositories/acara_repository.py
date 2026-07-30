from sqlalchemy import delete, select, update

from app.models import Acara, File, Karya, Pilihan, Responden
from app.repositories.base import BaseRepository


class AcaraRepository(BaseRepository):
    def get_public(self, acara_id: int):
        stmt = select(Acara).where(Acara.acaraID == acara_id and Acara.status == "Aktif")
        return self.db.execute(stmt).scalar_one_or_none()

    def get(self, acara_id: int):
        return self.db.execute(select(Acara).where(Acara.acaraID == acara_id)).scalar_one_or_none()

    def create(self, **values):
        entity = Acara(**values)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def update(self, acara_id: int, **values):
        self.db.execute(update(Acara).where(Acara.acaraID == acara_id).values(**values))
        self.db.commit()

    def list_public(self):
        return self.db.execute(select(Acara).where(Acara.status != "Draft")).scalars().all()

    def list_all(self):
        return self.db.execute(select(Acara)).scalars().all()

    def karya_paths(self, acara_id: int):
        stmt = select(File.direktori).join(Karya, Karya.fileID == File.fileID).where(Karya.acaraID == acara_id)
        return self.db.execute(stmt).scalars().all()

    def karya_file_ids(self, acara_id: int):
        return self.db.execute(select(Karya.fileID).where(Karya.acaraID == acara_id)).scalars().all()

    def delete_pilihan(self, acara_id: int):
        self.db.execute(delete(Pilihan).where(Pilihan.karyaID.in_(select(Karya.karyaID).where(Karya.acaraID == acara_id))))

    def delete_respondens(self, acara_id: int):
        self.db.execute(delete(Responden).where(Responden.acaraID == acara_id))

    def delete_karyas(self, acara_id: int):
        self.db.execute(delete(Karya).where(Karya.acaraID == acara_id))

    def delete_acara(self, acara_id: int):
        self.db.execute(delete(Acara).where(Acara.acaraID == acara_id))

    def delete_files(self, file_ids: list[int]):
        self.db.execute(delete(File).where(File.fileID.in_(file_ids)))

    def file_path(self, file_id: int):
        return self.db.execute(select(File.direktori).where(File.fileID == file_id)).scalar_one_or_none()

    def delete_file(self, file_id: int):
        self.db.execute(delete(File).where(File.fileID == file_id))
