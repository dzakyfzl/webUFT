"""Service for Offer Kerja Sama / Job Masuk.

Modul sensitif — hanya Kadiv/Wakadiv/Super Admin.
Ref: PRD §3.5b
"""

from app.repositories.hr.offer_repo import OfferKerjasamaRepository
from app.schemas.hr.offer import OfferKerjasamaCreate, OfferKerjasamaResponse, OfferKerjasamaUpdate
from app.services.hr.audit_service import AuditService
from app.services.result import ServiceResult


class OfferKerjasamaService:
    def __init__(self, repository: OfferKerjasamaRepository, audit: AuditService):
        self.repo = repository
        self.audit = audit

    def create(self, data: OfferKerjasamaCreate, user: dict) -> ServiceResult:
        try:
            entity = self.repo.create(
                nama_pengaju=data.nama_pengaju,
                kategori=data.kategori,
                kontak_person=data.kontak_person,
                deskripsi=data.deskripsi,
                bukti_link=data.bukti_link,
                nilai=data.nilai,
                note=data.note,
                created_by=user.get("user_id", 0),
            )
            self.audit.log(modul="offer_kerjasama", record_id=entity.id, aksi="created", user=user)
            self.repo.commit()
            return ServiceResult(OfferKerjasamaResponse.model_validate(entity).model_dump(), 201)
        except Exception as exc:
            self.repo.rollback()
            print(f"Error creating offer kerjasama: {exc}")
            return ServiceResult({"message": "Gagal membuat offer kerja sama"}, 500)

    def get(self, offer_id: int) -> ServiceResult:
        entity = self.repo.get_by_id(offer_id)
        if entity is None:
            return ServiceResult({"message": "Not found"}, 404)
        audit_logs = self.audit.get_logs_for_record("offer_kerjasama", offer_id)
        response = OfferKerjasamaResponse.model_validate(entity).model_dump()
        response["audit_logs"] = [
            {
                "id": log.id, "aksi": log.aksi, "user_nama": log.user_nama,
                "field_key": log.field_key, "nilai_lama": log.nilai_lama,
                "nilai_baru": log.nilai_baru, "via_ai": log.via_ai,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in audit_logs
        ]
        return ServiceResult(response)

    def list(self, status=None, search=None, skip=0, limit=50) -> ServiceResult:
        entities = self.repo.list_all(status=status, search=search, skip=skip, limit=limit)
        total = self.repo.count(status=status)
        return ServiceResult({
            "data": [OfferKerjasamaResponse.model_validate(e).model_dump() for e in entities],
            "total": total,
        })

    def update(self, offer_id: int, data: OfferKerjasamaUpdate, user: dict) -> ServiceResult:
        old = self.repo.get_by_id(offer_id)
        if old is None:
            return ServiceResult({"message": "Not found"}, 404)

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return ServiceResult({"message": "Tidak ada data yang diperbarui"}, 400)

        if "status" in update_data and old.status != update_data["status"]:
            self.audit.log(
                modul="offer_kerjasama", record_id=offer_id,
                aksi="status_changed", user=user,
                field_key="status", nilai_lama=old.status, nilai_baru=update_data["status"],
            )
        if "note" in update_data and old.note != update_data["note"]:
            self.audit.log(
                modul="offer_kerjasama", record_id=offer_id,
                aksi="updated", user=user, field_key="note",
                nilai_lama=old.note, nilai_baru=update_data["note"],
            )

        try:
            entity = self.repo.update(offer_id, **update_data)
            return ServiceResult(OfferKerjasamaResponse.model_validate(entity).model_dump())
        except Exception as exc:
            self.repo.rollback()
            return ServiceResult({"message": "Gagal memperbarui offer kerja sama"}, 500)

    def delete(self, offer_id: int, user: dict) -> ServiceResult:
        if self.repo.get_by_id(offer_id) is None:
            return ServiceResult({"message": "Not found"}, 404)
        self.audit.log(modul="offer_kerjasama", record_id=offer_id, aksi="deleted", user=user)
        try:
            self.repo.delete(offer_id)
            return ServiceResult({"message": "Offer kerja sama berhasil dihapus"})
        except Exception as exc:
            self.repo.rollback()
            return ServiceResult({"message": "Gagal menghapus offer kerja sama"}, 500)
