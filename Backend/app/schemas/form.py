from typing import Optional
from pydantic import BaseModel


class FormCreate(BaseModel):
    nama: str
    prodi_instansi: str
    nim: Optional[str] = None
    karyaID: int

