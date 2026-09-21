from typing import Optional

from pydantic import BaseModel


class DataPartner(BaseModel):
    label: str
    judul: str
    deskripsi: Optional[str] = None
    kategori: str = "sponsor"   # "sponsor" | "media_partner"
    urutan: int = 0
    fileID: Optional[int] = None
    is_active: bool = True


class TogglePartner(BaseModel):
    is_active: bool
