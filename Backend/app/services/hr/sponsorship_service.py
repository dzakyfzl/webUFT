"""Service for Sponsorship module.

Handles Sponsor CRUD + sub-records (Proposal, Offer, Note) + audit trail.
"""

from app.repositories.hr.sponsorship_repo import SponsorRepository
from app.schemas.hr.sponsorship import (
    SponsorCreate,
    SponsorDetailResponse,
    SponsorNoteCreate,
    SponsorNoteResponse,
    SponsorOfferCreate,
    SponsorOfferResponse,
    SponsorOfferUpdate,
    SponsorProposalCreate,
    SponsorProposalResponse,
    SponsorResponse,
    SponsorUpdate,
)
from app.services.hr.audit_service import AuditService
from app.services.result import ServiceResult


class SponsorshipService:
    def __init__(self, repository: SponsorRepository, audit: AuditService):
        self.repo = repository
        self.audit = audit

    # --- Sponsor CRUD ---

    def create(self, data: SponsorCreate, user: dict) -> ServiceResult:
        try:
            entity = self.repo.create(
                nama_perusahaan=data.nama_perusahaan,
                pic_internal_id=data.pic_internal_id,
                cp_nama=data.cp_nama,
                cp_jabatan=data.cp_jabatan,
                cp_wa=data.cp_wa,
                cp_email=data.cp_email,
                created_by=user.get("user_id", 0),
            )
            self.audit.log(modul="sponsor", record_id=entity.id, aksi="created", user=user)
            self.repo.commit()
            return ServiceResult(SponsorResponse.model_validate(entity).model_dump(), 201)
        except Exception as exc:
            self.repo.rollback()
            print(f"Error creating sponsor: {exc}")
            return ServiceResult({"message": "Gagal membuat sponsor"}, 500)

    def get(self, sponsor_id: int) -> ServiceResult:
        entity = self.repo.get_by_id(sponsor_id)
        if entity is None:
            return ServiceResult({"message": "Sponsor tidak ditemukan"}, 404)
        audit_logs = self.audit.get_logs_for_record("sponsor", sponsor_id)
        response = SponsorDetailResponse.model_validate(entity).model_dump()
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

    def list(self, status=None, search=None, skip=0, limit=50) -> ServiceResult:
        entities = self.repo.list_all(status=status, search=search, skip=skip, limit=limit)
        total = self.repo.count(status=status)
        return ServiceResult({
            "data": [SponsorResponse.model_validate(e).model_dump() for e in entities],
            "total": total,
        })

    def update(self, sponsor_id: int, data: SponsorUpdate, user: dict) -> ServiceResult:
        old = self.repo.get_by_id(sponsor_id)
        if old is None:
            return ServiceResult({"message": "Sponsor tidak ditemukan"}, 404)

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return ServiceResult({"message": "Tidak ada data yang diperbarui"}, 400)

        for field in ("status", "pic_internal_id"):
            if field in update_data and getattr(old, field) != update_data[field]:
                self.audit.log(
                    modul="sponsor", record_id=sponsor_id,
                    aksi="status_changed" if field == "status" else "assignment_changed",
                    user=user, field_key=field,
                    nilai_lama=str(getattr(old, field)),
                    nilai_baru=str(update_data[field]),
                )

        non_key = {k: v for k, v in update_data.items() if k not in ("status", "pic_internal_id")}
        if non_key:
            self.audit.log(modul="sponsor", record_id=sponsor_id, aksi="updated", user=user)

        try:
            entity = self.repo.update(sponsor_id, **update_data)
            return ServiceResult(SponsorResponse.model_validate(entity).model_dump())
        except Exception as exc:
            self.repo.rollback()
            print(f"Error updating sponsor: {exc}")
            return ServiceResult({"message": "Gagal memperbarui sponsor"}, 500)

    def delete(self, sponsor_id: int, user: dict) -> ServiceResult:
        entity = self.repo.get_by_id(sponsor_id)
        if entity is None:
            return ServiceResult({"message": "Sponsor tidak ditemukan"}, 404)
        self.audit.log(modul="sponsor", record_id=sponsor_id, aksi="deleted", user=user)
        try:
            self.repo.delete(sponsor_id)
            return ServiceResult({"message": "Sponsor berhasil dihapus"})
        except Exception as exc:
            self.repo.rollback()
            return ServiceResult({"message": "Gagal menghapus sponsor"}, 500)

    # --- Sub-records ---

    def add_proposal(self, sponsor_id: int, data: SponsorProposalCreate, user: dict) -> ServiceResult:
        if self.repo.get_by_id(sponsor_id) is None:
            return ServiceResult({"message": "Sponsor tidak ditemukan"}, 404)
        try:
            proposal = self.repo.add_proposal(
                sponsor_id=sponsor_id,
                created_by=user.get("user_id", 0),
                tanggal_kirim=data.tanggal_kirim,
                versi=data.versi,
                link_file=data.link_file,
            )
            self.audit.log(modul="sponsor", record_id=sponsor_id, aksi="proposal_added", user=user)
            self.repo.commit()
            return ServiceResult(SponsorProposalResponse.model_validate(proposal).model_dump(), 201)
        except Exception as exc:
            self.repo.rollback()
            return ServiceResult({"message": "Gagal menambahkan proposal"}, 500)

    def add_offer(self, sponsor_id: int, data: SponsorOfferCreate, user: dict) -> ServiceResult:
        if self.repo.get_by_id(sponsor_id) is None:
            return ServiceResult({"message": "Sponsor tidak ditemukan"}, 404)
        try:
            offer = self.repo.add_offer(
                sponsor_id=sponsor_id,
                created_by=user.get("user_id", 0),
                nilai=data.nilai,
                bentuk_kerjasama=data.bentuk_kerjasama,
                syarat=data.syarat,
                status=data.status,
            )
            self.audit.log(modul="sponsor", record_id=sponsor_id, aksi="offer_added", user=user)
            self.repo.commit()
            return ServiceResult(SponsorOfferResponse.model_validate(offer).model_dump(), 201)
        except Exception as exc:
            self.repo.rollback()
            return ServiceResult({"message": "Gagal menambahkan offer"}, 500)

    def update_offer(self, sponsor_id: int, offer_id: int, data: SponsorOfferUpdate, user: dict) -> ServiceResult:
        old_offer = self.repo.get_offer(offer_id)
        if old_offer is None or old_offer.sponsor_id != sponsor_id:
            return ServiceResult({"message": "Offer tidak ditemukan"}, 404)

        update_data = data.model_dump(exclude_unset=True)
        if "status" in update_data and old_offer.status != update_data["status"]:
            self.audit.log(
                modul="sponsor", record_id=sponsor_id,
                aksi="offer_status_changed", user=user,
                field_key="offer_status", nilai_lama=old_offer.status, nilai_baru=update_data["status"],
            )

        try:
            offer = self.repo.update_offer(offer_id, **update_data)
            return ServiceResult(SponsorOfferResponse.model_validate(offer).model_dump())
        except Exception as exc:
            self.repo.rollback()
            return ServiceResult({"message": "Gagal memperbarui offer"}, 500)

    def add_note(self, sponsor_id: int, data: SponsorNoteCreate, user: dict) -> ServiceResult:
        if self.repo.get_by_id(sponsor_id) is None:
            return ServiceResult({"message": "Sponsor tidak ditemukan"}, 404)
        try:
            note = self.repo.add_note(sponsor_id=sponsor_id, content=data.content, created_by=user.get("user_id", 0))
            self.audit.log(
                modul="sponsor", record_id=sponsor_id, aksi="note_added",
                user=user, field_key="note", nilai_baru=data.content[:100],
            )
            self.repo.commit()
            return ServiceResult(SponsorNoteResponse.model_validate(note).model_dump(), 201)
        except Exception as exc:
            self.repo.rollback()
            return ServiceResult({"message": "Gagal menambahkan catatan"}, 500)
