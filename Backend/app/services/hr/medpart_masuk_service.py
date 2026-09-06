"""Service for Medpart Masuk (Inbound).

Business logic + audit trail integration.
"""

from app.repositories.hr.medpart_masuk_repo import MedpartMasukRepository
from app.schemas.hr.medpart_masuk import (
    MedpartMasukCreate,
    MedpartMasukDetailResponse,
    MedpartMasukNoteCreate,
    MedpartMasukResponse,
    MedpartMasukUpdate,
    NoteResponse,
)
from app.services.hr.audit_service import AuditService
from app.services.result import ServiceResult


class MedpartMasukService:
    def __init__(self, repository: MedpartMasukRepository, audit: AuditService):
        self.repo = repository
        self.audit = audit

    def create(self, data: MedpartMasukCreate, user: dict) -> ServiceResult:
        try:
            entity = self.repo.create(
                nama=data.nama,
                platform=data.platform,
                kontak=data.kontak,
                jumlah_followers=data.jumlah_followers,
                link_bukti=data.link_bukti,
                syarat=data.syarat,
                created_by=user.get("user_id", 0),
            )
            self.audit.log(
                modul="medpart_masuk",
                record_id=entity.id,
                aksi="created",
                user=user,
            )
            self.repo.commit()
            return ServiceResult(
                MedpartMasukResponse.model_validate(entity).model_dump(),
                201,
            )
        except Exception as exc:
            self.repo.rollback()
            print(f"Error creating medpart masuk: {exc}")
            return ServiceResult({"message": "Gagal membuat medpart masuk"}, 500)

    def get(self, medpart_id: int) -> ServiceResult:
        entity = self.repo.get_by_id(medpart_id)
        if entity is None:
            return ServiceResult({"message": "Medpart masuk tidak ditemukan"}, 404)
        audit_logs = self.audit.get_logs_for_record("medpart_masuk", medpart_id)
        response = MedpartMasukDetailResponse.model_validate(entity).model_dump()
        response["audit_logs"] = [
            {
                "id": log.id,
                "aksi": log.aksi,
                "user_nama": log.user_nama,
                "field_key": log.field_key,
                "nilai_lama": log.nilai_lama,
                "nilai_baru": log.nilai_baru,
                "via_ai": log.via_ai,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in audit_logs
        ]
        return ServiceResult(response)

    def list(
        self,
        status: str | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> ServiceResult:
        entities = self.repo.list_all(status=status, search=search, skip=skip, limit=limit)
        total = self.repo.count(status=status)
        return ServiceResult({
            "data": [MedpartMasukResponse.model_validate(e).model_dump() for e in entities],
            "total": total,
        })

    def update(self, medpart_id: int, data: MedpartMasukUpdate, user: dict) -> ServiceResult:
        old = self.repo.get_by_id(medpart_id)
        if old is None:
            return ServiceResult({"message": "Medpart masuk tidak ditemukan"}, 404)

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return ServiceResult({"message": "Tidak ada data yang diperbarui"}, 400)

        # Log key field changes
        for field in ("status",):
            if field in update_data and getattr(old, field) != update_data[field]:
                self.audit.log(
                    modul="medpart_masuk",
                    record_id=medpart_id,
                    aksi="status_changed" if field == "status" else "updated",
                    user=user,
                    field_key=field,
                    nilai_lama=getattr(old, field),
                    nilai_baru=update_data[field],
                )

        # General update log if non-key fields changed
        non_key_changes = {k: v for k, v in update_data.items() if k != "status"}
        if non_key_changes:
            self.audit.log(
                modul="medpart_masuk",
                record_id=medpart_id,
                aksi="updated",
                user=user,
            )

        try:
            entity = self.repo.update(medpart_id, **update_data)
            return ServiceResult(MedpartMasukResponse.model_validate(entity).model_dump())
        except Exception as exc:
            self.repo.rollback()
            print(f"Error updating medpart masuk: {exc}")
            return ServiceResult({"message": "Gagal memperbarui medpart masuk"}, 500)

    def delete(self, medpart_id: int, user: dict) -> ServiceResult:
        entity = self.repo.get_by_id(medpart_id)
        if entity is None:
            return ServiceResult({"message": "Medpart masuk tidak ditemukan"}, 404)

        self.audit.log(
            modul="medpart_masuk",
            record_id=medpart_id,
            aksi="deleted",
            user=user,
        )

        try:
            self.repo.delete(medpart_id)
            return ServiceResult({"message": "Medpart masuk berhasil dihapus"})
        except Exception as exc:
            self.repo.rollback()
            print(f"Error deleting medpart masuk: {exc}")
            return ServiceResult({"message": "Gagal menghapus medpart masuk"}, 500)

    def add_note(self, medpart_id: int, data: MedpartMasukNoteCreate, user: dict) -> ServiceResult:
        entity = self.repo.get_by_id(medpart_id)
        if entity is None:
            return ServiceResult({"message": "Medpart masuk tidak ditemukan"}, 404)

        try:
            note = self.repo.add_note(
                medpart_id=medpart_id,
                content=data.content,
                created_by=user.get("user_id", 0),
            )
            self.audit.log(
                modul="medpart_masuk",
                record_id=medpart_id,
                aksi="note_added",
                user=user,
                field_key="note",
                nilai_baru=data.content[:100],  # truncate for audit
            )
            self.repo.commit()
            return ServiceResult(NoteResponse.model_validate(note).model_dump(), 201)
        except Exception as exc:
            self.repo.rollback()
            print(f"Error adding note: {exc}")
            return ServiceResult({"message": "Gagal menambahkan catatan"}, 500)
