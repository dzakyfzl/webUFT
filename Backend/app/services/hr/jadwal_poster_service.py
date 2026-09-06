"""Service for Jadwal Poster (Media Partner Posting Schedule).

Business logic: create/update jadwal, auto-detect overdue status.
"""

from datetime import datetime

from app.repositories.hr.jadwal_poster_repo import JadwalPosterRepository
from app.schemas.hr.supporting import JadwalPosterCreate, JadwalPosterResponse, JadwalPosterUpdate
from app.services.hr.audit_service import AuditService
from app.services.result import ServiceResult


class JadwalPosterService:
    def __init__(self, repository: JadwalPosterRepository, audit: AuditService):
        self.repo = repository
        self.audit = audit

    def create(self, data: JadwalPosterCreate, user: dict) -> ServiceResult:
        try:
            entity = self.repo.create(
                medpart_id=data.medpart_id,
                proker_id=data.proker_id,
                tanggal_deadline=data.tanggal_deadline,
                catatan=data.catatan,
                status="Terjadwal",
                created_by=user.get("user_id", 0),
            )
            self.audit.log(
                modul="jadwal_poster",
                record_id=entity.id,
                aksi="created",
                user=user,
            )
            self.repo.commit()
            return ServiceResult(JadwalPosterResponse.model_validate(entity).model_dump(), 201)
        except Exception as exc:
            self.repo.rollback()
            print(f"Error creating jadwal poster: {exc}")
            return ServiceResult({"message": "Gagal membuat jadwal poster"}, 500)

    def get(self, jadwal_id: int) -> ServiceResult:
        entity = self.repo.get_by_id(jadwal_id)
        if entity is None:
            return ServiceResult({"message": "Jadwal poster tidak ditemukan"}, 404)
        # Auto-check overdue
        if (
            entity.status in ("Belum Jadwal", "Terjadwal")
            and entity.tanggal_deadline < datetime.utcnow()
        ):
            entity = self.repo.update(jadwal_id, status="Telat")
        return ServiceResult(JadwalPosterResponse.model_validate(entity).model_dump())

    def list(
        self,
        medpart_id: int | None = None,
        proker_id: int | None = None,
        status: str | None = None,
        overdue_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> ServiceResult:
        entities = self.repo.list_all(
            medpart_id=medpart_id,
            proker_id=proker_id,
            status=status,
            overdue_only=overdue_only,
            skip=skip,
            limit=limit,
        )
        total = self.repo.count(medpart_id=medpart_id, status=status)
        return ServiceResult({
            "data": [JadwalPosterResponse.model_validate(e).model_dump() for e in entities],
            "total": total,
        })

    def update(self, jadwal_id: int, data: JadwalPosterUpdate, user: dict) -> ServiceResult:
        old = self.repo.get_by_id(jadwal_id)
        if old is None:
            return ServiceResult({"message": "Jadwal poster tidak ditemukan"}, 404)

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return ServiceResult({"message": "Tidak ada data yang diperbarui"}, 400)

        # Audit status change
        if "status" in update_data and old.status != update_data["status"]:
            self.audit.log(
                modul="jadwal_poster",
                record_id=jadwal_id,
                aksi="status_changed",
                user=user,
                field_key="status",
                nilai_lama=old.status,
                nilai_baru=update_data["status"],
            )
        else:
            self.audit.log(
                modul="jadwal_poster",
                record_id=jadwal_id,
                aksi="updated",
                user=user,
            )

        try:
            entity = self.repo.update(jadwal_id, **update_data)
            return ServiceResult(JadwalPosterResponse.model_validate(entity).model_dump())
        except Exception as exc:
            self.repo.rollback()
            print(f"Error updating jadwal poster: {exc}")
            return ServiceResult({"message": "Gagal memperbarui jadwal poster"}, 500)

    def delete(self, jadwal_id: int, user: dict) -> ServiceResult:
        entity = self.repo.get_by_id(jadwal_id)
        if entity is None:
            return ServiceResult({"message": "Jadwal poster tidak ditemukan"}, 404)

        self.audit.log(
            modul="jadwal_poster",
            record_id=jadwal_id,
            aksi="deleted",
            user=user,
        )
        try:
            self.repo.delete(jadwal_id)
            return ServiceResult({"message": "Jadwal poster berhasil dihapus"})
        except Exception as exc:
            self.repo.rollback()
            print(f"Error deleting jadwal poster: {exc}")
            return ServiceResult({"message": "Gagal menghapus jadwal poster"}, 500)

    def sync_overdue(self) -> ServiceResult:
        """Digunakan oleh cron APScheduler untuk update status overdue secara batch."""
        count = self.repo.mark_overdue()
        return ServiceResult({"updated": count})
