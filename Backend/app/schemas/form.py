from pydantic import BaseModel


class FormCreate(BaseModel):
    nama: str
    prodi_instansi: str
    nomor: str
    nim: str
    karyaID: int
