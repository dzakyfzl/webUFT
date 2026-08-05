from fastapi import Depends

from app.core.database import get_db
from app.repositories.acara_repository import AcaraRepository
from app.repositories.akun_repository import AkunRepository
from app.repositories.album_repository import AlbumRepository
from app.repositories.file_repository import FileRepository
from app.repositories.form_repository import FormRepository
from app.repositories.foto_repository import FotoRepository
from app.repositories.karya_repository import KaryaRepository
from app.repositories.shortlink_repository import ShortLinkRepository
from app.services.acara_service import AcaraService
from app.services.akun_service import AkunService
from app.services.album_service import AlbumService
from app.services.file_service import FileService
from app.services.form_service import FormService
from app.services.foto_service import FotoService
from app.services.karya_service import KaryaService
from app.services.shortlink import ShortLinkService


def get_acara_service(db=Depends(get_db)):
    return AcaraService(AcaraRepository(db))


def get_akun_service(db=Depends(get_db)):
    return AkunService(AkunRepository(db))


def get_file_service(db=Depends(get_db)):
    return FileService(FileRepository(db))


def get_karya_service(db=Depends(get_db)):
    return KaryaService(KaryaRepository(db))


def get_form_service(db=Depends(get_db)):
    return FormService(FormRepository(db))


def get_album_service(db=Depends(get_db)):
    file_service = FileService(FileRepository(db))
    return AlbumService(AlbumRepository(db), file_service)


def get_foto_service(db=Depends(get_db)):
    file_service = FileService(FileRepository(db))
    return FotoService(FotoRepository(db), file_service)

def get_link_service(db=Depends(get_db)):
    return ShortLinkService(ShortLinkRepository(db))
