from sqlalchemy import and_, delete, select, update

from app.models import Album, Foto
from app.repositories.base import BaseRepository


class AlbumRepository(BaseRepository):
    def create_with_legacy_status(self, nama: str, deskripsi: str):
        entity = Album(nama=nama, deskripsi=deskripsi, status="Aktif")
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def update(self, album_id: int, nama: str, deskripsi: str):
        result = self.db.execute(update(Album).where(Album.albumID == album_id).values(nama=nama, deskripsi=deskripsi))
        if result.rowcount:
            self.db.commit()
        return result.rowcount

    def get(self, album_id: int):
        stmt = select(Album.albumID, Album.nama, Album.deskripsi, Foto.nama, Foto.pemilik, Foto.fileID).where(and_(Album.albumID == album_id)).join(Foto, Album.albumID == Foto.albumID)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_range(self, start: int, end: int):
        stmt = select(Album.albumID, Album.nama, Album.deskripsi, Foto.nama, Foto.pemilik, Foto.fileID).join(Foto, Album.albumID == Foto.albumID).offset(start).limit(end - start)
        return self.db.execute(stmt).scalars().all()

    def foto_file_ids(self, album_id: int):
        return self.db.execute(select(Foto.fileID).where(Foto.albumID == album_id)).scalars().all()

    def delete(self, album_id: int):
        self.db.execute(delete(Foto).where(Foto.albumID == album_id))
        self.db.execute(delete(Album).where(Album.albumID == album_id))
        self.db.commit()
