from typing import Optional

from pydantic import BaseModel


class AcaraCreate(BaseModel):
    nama: str
    deskripsi: str
    tempat: str
    waktu: str
    waktu_selesai: str
    fileID: Optional[int] = None
    status: str
