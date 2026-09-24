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
    # Geofence (opsional — jika NULL berarti tidak ada pembatasan lokasi)
    geo_latitude: Optional[float] = None
    geo_longitude: Optional[float] = None
    geo_radius: Optional[int] = None      # meter
    geo_toleransi: Optional[int] = None   # buffer tambahan dalam meter
