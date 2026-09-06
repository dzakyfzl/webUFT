"""Services for Proker, Undangan, Reminder, Aspirasi, and Overdue Engine."""

from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status

from app.repositories.hr.proker_repo import ProkerRepository
from app.repositories.hr.undangan_repo import UndanganRepository
from app.repositories.hr.reminder_repo import ReminderRepository
from app.repositories.hr.aspirasi_repo import AspirasiRepository
from app.schemas.hr.proker_undangan import (
    ProkerCreate,
    ProkerDetailResponse,
    ProkerMedpartCreate,
    ProkerMedpartResponse,
    ProkerResponse,
    ProkerSponsorCreate,
    ProkerSponsorResponse,
    ProkerUpdate,
    UndanganAssignCreate,
    UndanganAssignResponse,
    UndanganCreate,
    UndanganDetailResponse,
    UndanganResponse,
    UndanganUpdate,
    ReminderCreate,
    ReminderResponse,
    ReminderUpdate,
    AspirasiMarkSentRequest,
    AspirasiRiwayatResponse,
    AspirasiSettingsResponse,
    AspirasiSettingsUpdate,
)


# ============================================================
# ProkerService
# ============================================================

class ProkerService:
    def __init__(self, repo: ProkerRepository):
        self.repo = repo

    def create(self, data: ProkerCreate, user_id: int) -> ProkerResponse:
        entity = self.repo.create(
            nama=data.nama,
            deskripsi=data.deskripsi,
            created_by=user_id,
        )
        return ProkerResponse.model_validate(entity)

    def list_all(self, skip: int = 0, limit: int = 50) -> dict:
        items = self.repo.list_all(skip=skip, limit=limit)
        total = self.repo.count()
        return {"data": [ProkerResponse.model_validate(i) for i in items], "total": total}

    def get(self, proker_id: int) -> ProkerDetailResponse:
        entity = self.repo.get_by_id(proker_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proker tidak ditemukan")
        return ProkerDetailResponse.model_validate(entity)

    def update(self, proker_id: int, data: ProkerUpdate) -> ProkerResponse:
        entity = self.repo.update(
            proker_id,
            **{k: v for k, v in data.model_dump().items() if v is not None},
        )
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proker tidak ditemukan")
        return ProkerResponse.model_validate(entity)

    def delete(self, proker_id: int) -> dict:
        ok = self.repo.delete(proker_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proker tidak ditemukan")
        return {"message": "Proker berhasil dihapus"}

    def add_medpart(self, proker_id: int, data: ProkerMedpartCreate) -> ProkerMedpartResponse:
        pivot = self.repo.add_medpart(proker_id, data.medpart_id, data.status_kehadiran)
        return ProkerMedpartResponse.model_validate(pivot)

    def remove_medpart(self, proker_id: int, medpart_id: int) -> dict:
        ok = self.repo.remove_medpart(proker_id, medpart_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medpart tidak terdaftar di proker ini")
        return {"message": "Medpart berhasil dihapus dari proker"}

    def add_sponsor(self, proker_id: int, data: ProkerSponsorCreate) -> ProkerSponsorResponse:
        pivot = self.repo.add_sponsor(proker_id, data.sponsor_id, data.status)
        return ProkerSponsorResponse.model_validate(pivot)

    def remove_sponsor(self, proker_id: int, sponsor_id: int) -> dict:
        ok = self.repo.remove_sponsor(proker_id, sponsor_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sponsor tidak terdaftar di proker ini")
        return {"message": "Sponsor berhasil dihapus dari proker"}


# ============================================================
# UndanganService
# ============================================================

class UndanganService:
    def __init__(self, repo: UndanganRepository):
        self.repo = repo

    def create(self, data: UndanganCreate, user_id: int) -> UndanganResponse:
        entity = self.repo.create(
            created_by=user_id,
            **data.model_dump(),
        )
        return UndanganResponse.model_validate(entity)

    def list_all(self, status: Optional[str] = None, skip: int = 0, limit: int = 50) -> dict:
        items = self.repo.list_all(status=status, skip=skip, limit=limit)
        total = self.repo.count(status=status)
        return {"data": [UndanganResponse.model_validate(i) for i in items], "total": total}

    def get(self, undangan_id: int) -> UndanganDetailResponse:
        entity = self.repo.get_by_id(undangan_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Undangan tidak ditemukan")
        return UndanganDetailResponse.model_validate(entity)

    def update(self, undangan_id: int, data: UndanganUpdate) -> UndanganResponse:
        entity = self.repo.update(
            undangan_id,
            **{k: v for k, v in data.model_dump().items() if v is not None},
        )
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Undangan tidak ditemukan")
        return UndanganResponse.model_validate(entity)

    def delete(self, undangan_id: int) -> dict:
        ok = self.repo.delete(undangan_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Undangan tidak ditemukan")
        return {"message": "Undangan berhasil dihapus"}

    def assign(self, undangan_id: int, data: UndanganAssignCreate) -> UndanganAssignResponse:
        a = self.repo.assign(undangan_id, data.akun_id)
        return UndanganAssignResponse.model_validate(a)

    def unassign(self, undangan_id: int, akun_id: int) -> dict:
        ok = self.repo.unassign(undangan_id, akun_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment tidak ditemukan")
        return {"message": "Assignee berhasil dihapus"}

    def update_kehadiran(self, undangan_id: int, akun_id: int, status: str) -> UndanganAssignResponse:
        a = self.repo.update_kehadiran(undangan_id, akun_id, status)
        if a is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment tidak ditemukan")
        return UndanganAssignResponse.model_validate(a)


# ============================================================
# ReminderService + Overdue Engine
# ============================================================

class ReminderService:
    def __init__(self, repo: ReminderRepository):
        self.repo = repo

    def create(self, data: ReminderCreate) -> ReminderResponse:
        entity = self.repo.create(**data.model_dump())
        return ReminderResponse.model_validate(entity)

    def list_all(
        self,
        jenis: Optional[str] = None,
        status: Optional[str] = None,
        assigned_to: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> dict:
        items = self.repo.list_all(jenis=jenis, status=status, assigned_to=assigned_to, skip=skip, limit=limit)
        total = self.repo.count(status=status, assigned_to=assigned_to)
        return {"data": [ReminderResponse.model_validate(i) for i in items], "total": total}

    def update(self, reminder_id: int, data: ReminderUpdate) -> ReminderResponse:
        entity = self.repo.update(
            reminder_id,
            **{k: v for k, v in data.model_dump().items() if v is not None},
        )
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder tidak ditemukan")
        return ReminderResponse.model_validate(entity)

    def mark_done(self, reminder_id: int) -> ReminderResponse:
        entity = self.repo.update(reminder_id, status="Selesai")
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder tidak ditemukan")
        return ReminderResponse.model_validate(entity)

    def delete(self, reminder_id: int) -> dict:
        ok = self.repo.delete(reminder_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder tidak ditemukan")
        return {"message": "Reminder berhasil dihapus"}

    def run_overdue_sync(self) -> dict:
        """Dipanggil oleh APScheduler setiap jam."""
        count = self.repo.mark_overdue()
        return {"updated": count}

    def get_dashboard(self) -> dict:
        sections = self.repo.get_dashboard_sections()
        return {
            "overdue": [ReminderResponse.model_validate(r) for r in sections["overdue"]],
            "mendekati": [ReminderResponse.model_validate(r) for r in sections["mendekati"]],
            "akan_datang": [ReminderResponse.model_validate(r) for r in sections["akan_datang"]],
        }


# ============================================================
# AspirasiService
# ============================================================

class AspirasiService:
    def __init__(self, repo: AspirasiRepository):
        self.repo = repo

    def get_settings(self) -> AspirasiSettingsResponse:
        entity = self.repo.get_settings()
        if entity is None:
            # Return empty defaults
            return AspirasiSettingsResponse(
                id=1, link_form=None, link_grup_wa=None, template_pesan=None,
                updated_by=None, updated_at=datetime.utcnow(),
            )
        return AspirasiSettingsResponse.model_validate(entity)

    def update_settings(self, data: AspirasiSettingsUpdate, user_id: int) -> AspirasiSettingsResponse:
        entity = self.repo.upsert_settings(
            updated_by=user_id,
            **{k: v for k, v in data.model_dump().items() if v is not None},
        )
        return AspirasiSettingsResponse.model_validate(entity)

    def get_riwayat(self, tahun: Optional[int] = None) -> list[AspirasiRiwayatResponse]:
        items = self.repo.list_riwayat(tahun=tahun)
        return [AspirasiRiwayatResponse.model_validate(i) for i in items]

    def get_bulan_ini(self) -> AspirasiRiwayatResponse:
        entity = self.repo.ensure_riwayat_bulan_ini()
        return AspirasiRiwayatResponse.model_validate(entity)

    def mark_sent(self, bulan: int, tahun: int, user_id: int, req: AspirasiMarkSentRequest) -> AspirasiRiwayatResponse:
        # Ensure record exists
        existing = self.repo.get_riwayat(bulan, tahun)
        if existing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record aspirasi tidak ditemukan")
        entity = self.repo.mark_sent(bulan, tahun, user_id, req.link_rekap)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gagal update")
        return AspirasiRiwayatResponse.model_validate(entity)

    def run_monthly_check(self) -> dict:
        """Dipanggil APScheduler tanggal 1 setiap bulan — pastikan record bulan ini ada."""
        entity = self.repo.ensure_riwayat_bulan_ini()
        overdue_count = self.repo.mark_overdue_riwayat()
        return {
            "bulan_ini_id": entity.id,
            "overdue_updated": overdue_count,
        }
