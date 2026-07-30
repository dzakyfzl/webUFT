from sqlalchemy import delete, select

from app.models import Foto
from app.repositories.base import BaseRepository


class FotoRepository(BaseRepository):
    def create(self, album_id: int, data):
        entity = Foto(nama=data.nama, pemilik=data.pemilik, fileID=data.fileID, albumID=album_id)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def file_id(self, foto_id: int):
        return self.db.execute(select(Foto.fileID).where(Foto.fotoID == foto_id)).scalar_one_or_none()

    def delete(self, foto_id: int):
        result = self.db.execute(delete(Foto).where(Foto.fotoID == foto_id))
        if result.rowcount:
            self.db.commit()
        return result.rowcount

    def get(self, foto_id: int):
        return self.db.execute(select(Foto).where(Foto.fotoID == foto_id)).scalar_one_or_none()

    def update(self, entity, data):
        entity.nama = data.nama
        entity.pemilik = data.pemilik
        entity.fileID = data.fileID
        self.db.commit()
