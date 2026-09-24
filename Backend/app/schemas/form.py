from typing import Optional
from pydantic import BaseModel


class FormCreate(BaseModel):
    nama: str
    prodi_instansi: str
    nim: Optional[str] = None
    karyaID: int
    # Koordinat GPS dari browser user (wajib jika acara punya geofence)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None   # akurasi GPS dalam meter (untuk deteksi fake GPS)

