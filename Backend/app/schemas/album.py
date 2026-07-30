from pydantic import BaseModel


class DataAlbum(BaseModel):
    nama: str
    deskripsi: str
