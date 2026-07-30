from pydantic import BaseModel


class DataFoto(BaseModel):
    nama: str
    pemilik: str
    fileID: int
