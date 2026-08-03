from sqlalchemy import and_, delete, select, update

from app.models import Album, Foto
from app.repositories.base import BaseRepository


class AlbumRepository(BaseRepository):
    def create_with_legacy_status(self, nama: str, deskripsi: str):
        entity = Album(nama=nama, deskripsi=deskripsi)
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
        album = self.db.execute(select(Album).where(Album.albumID == album_id)).scalar_one_or_none()
        if not album:
            return None
        return {
            "album": {
                "albumID": album.albumID,
                "nama": album.nama,
                "deskripsi": album.deskripsi
            },
            "fotos": [
                {
                    "fotoID": f.fotoID,
                    "nama": f.nama,
                    "pemilik": f.pemilik,
                    "fileID": f.fileID
                } for f in album.fotos
            ]
        }

    def getAll(self):
        stmt = select(Album.albumID, Album.nama, Album.deskripsi)
        return self.db.execute(stmt).mappings().all()

    def foto_file_ids(self, album_id: int):
        return self.db.execute(select(Foto.fileID).where(Foto.albumID == album_id)).scalars().all()

    def delete(self, album_id: int):
        self.db.execute(delete(Foto).where(Foto.albumID == album_id))
        self.db.execute(delete(Album).where(Album.albumID == album_id))
        self.db.commit()
