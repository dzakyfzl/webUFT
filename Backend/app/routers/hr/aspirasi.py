"""Router for Aspirasi (Aspirations Management)."""

from typing import Optional

from fastapi import APIRouter, Depends, Path, Query

from app.core.access_guard import require_access
from app.schemas.hr.proker_undangan import (
    AspirasiMarkSentRequest,
    AspirasiRiwayatResponse,
    AspirasiSettingsResponse,
    AspirasiSettingsUpdate,
)
from app.services.hr.dependencies import get_aspirasi_service

router = APIRouter(prefix="/aspirasi", tags=["HR - Aspirasi"])


@router.get("/settings", response_model=AspirasiSettingsResponse)
def get_settings(
    svc=Depends(get_aspirasi_service),
    user=Depends(require_access("Kelola Aspirasi")),
):
    return svc.get_settings()


@router.patch("/settings", response_model=AspirasiSettingsResponse)
def update_settings(
    data: AspirasiSettingsUpdate,
    svc=Depends(get_aspirasi_service),
    user=Depends(require_access("Kelola Aspirasi")),
):
    return svc.update_settings(data, user["akunID"])


@router.get("/riwayat", response_model=list[AspirasiRiwayatResponse])
def list_riwayat(
    tahun: Optional[int] = Query(None),
    svc=Depends(get_aspirasi_service),
    user=Depends(require_access("Kelola Aspirasi")),
):
    return svc.get_riwayat(tahun=tahun)


@router.get("/bulan-ini", response_model=AspirasiRiwayatResponse)
def get_bulan_ini(
    svc=Depends(get_aspirasi_service),
    user=Depends(require_access("Kelola Aspirasi")),
):
    """Ambil atau buat record aspirasi bulan berjalan."""
    return svc.get_bulan_ini()


@router.post("/riwayat/{bulan}/{tahun}/kirim", response_model=AspirasiRiwayatResponse)
def mark_sent(
    bulan: int = Path(..., ge=1, le=12),
    tahun: int = Path(..., ge=2020),
    data: AspirasiMarkSentRequest = AspirasiMarkSentRequest(),
    svc=Depends(get_aspirasi_service),
    user=Depends(require_access("Kelola Aspirasi")),
):
    """Tandai aspirasi bulan tertentu sebagai Terkirim."""
    return svc.mark_sent(bulan, tahun, user["akunID"], data)


@router.post("/sync-monthly")
def sync_monthly(
    svc=Depends(get_aspirasi_service),
    user=Depends(require_access("Kelola Aspirasi")),
):
    """Manual trigger sync bulanan (biasanya APScheduler tanggal 1)."""
    return svc.run_monthly_check()
