from pydantic import BaseModel


class KaryaCreate(BaseModel):
    nama: str
    deskripsi: str
    pemilik: str
    acaraID: int
    fileID: int
