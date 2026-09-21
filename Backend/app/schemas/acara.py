from pydantic import BaseModel


class AcaraCreate(BaseModel):
    nama: str
    deskripsi: str
    tempat: str
    waktu: str
    waktu_selesai: str
    fileID: int
    status: str
