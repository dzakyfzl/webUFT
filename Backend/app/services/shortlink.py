from app.repositories.shortlink_repository import ShortLinkRepository
from app.services.result import ServiceResult


class ShortLinkService:
    def __init__(self, repository: ShortLinkRepository):
        self.repository = repository

    def get(self, link_id: int) -> ServiceResult:
        try:
            entity = self.repository.get(link_id)
            if entity is None:
                return ServiceResult({"message": "Shortlink tidak ditemukan"}, 404)
            return ServiceResult({"linkID": entity.linkID, "slug": entity.slug, "destinationUrl": entity.destinationUrl})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def redirect(self, slug: str) -> ServiceResult:
        """Lookup shortlink by slug — dipakai untuk redirect oleh frontend."""
        try:
            entity = self.repository.get_by_slug(slug)
            if entity is None:
                return ServiceResult({"message": "Shortlink tidak ditemukan"}, 404)
            return ServiceResult({"slug": entity.slug, "destinationUrl": entity.destinationUrl})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def create(self, data) -> ServiceResult:
        """
        Buat shortlink baru.
        Idempotency guard: jika slug sudah ada, kembalikan 409 Conflict
        sehingga double-POST tidak menyebabkan data ganda.
        """
        try:
            # Cek duplikat slug
            existing = self.repository.get_by_slug(data.slug)
            if existing is not None:
                return ServiceResult({"message": f"Slug '{data.slug}' sudah digunakan"}, 409)

            entity = self.repository.create(
                destinationUrl=data.destinationUrl,
                slug=data.slug,
            )
            return ServiceResult(
                {"linkID": entity.linkID, "slug": entity.slug, "destinationUrl": entity.destinationUrl},
                201,
            )
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def list_all(self, user: dict) -> ServiceResult:
        """List semua shortlink — endpoint admin."""
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            entities = self.repository.get_all()
            return ServiceResult(
                [{"linkID": e.linkID, "slug": e.slug, "destinationUrl": e.destinationUrl} for e in entities]
            )
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def delete(self, link_id: int, user: dict) -> ServiceResult:
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            entity = self.repository.get(link_id)
            if entity is None:
                return ServiceResult({"message": "Shortlink tidak ditemukan"}, 404)
            self.repository.delete(link_id)
            self.repository.commit()
            return ServiceResult({"message": "Shortlink berhasil dihapus"})
        except Exception as exc:
            self.repository.rollback()
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    @staticmethod
    def _authorize(user: dict) -> "ServiceResult | None":
        if user.get("role") != "Admin" or "Kelola Link" not in user.get("access", []):
            return ServiceResult({"message": "Unauthorized"}, 403)
        return None