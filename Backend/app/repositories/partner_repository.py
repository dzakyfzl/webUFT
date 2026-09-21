from sqlalchemy import asc, delete, select, update

from app.models import Partner
from app.repositories.base import BaseRepository


class PartnerRepository(BaseRepository):
    def create(self, data) -> Partner:
        entity = Partner(
            label=data.label,
            judul=data.judul,
            deskripsi=data.deskripsi,
            kategori=data.kategori,
            urutan=data.urutan,
            fileID=data.fileID,
            is_active=data.is_active,
        )
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get(self, partner_id: int) -> Partner | None:
        return self.db.execute(
            select(Partner).where(Partner.partnerID == partner_id)
        ).scalar_one_or_none()

    def file_id(self, partner_id: int) -> int | None:
        return self.db.execute(
            select(Partner.fileID).where(Partner.partnerID == partner_id)
        ).scalar_one_or_none()

    def update(self, entity: Partner, data) -> None:
        entity.label = data.label
        entity.judul = data.judul
        entity.deskripsi = data.deskripsi
        entity.kategori = data.kategori
        entity.urutan = data.urutan
        entity.fileID = data.fileID
        entity.is_active = data.is_active
        self.db.commit()

    def toggle(self, partner_id: int, is_active: bool) -> int:
        result = self.db.execute(
            update(Partner)
            .where(Partner.partnerID == partner_id)
            .values(is_active=is_active)
        )
        if result.rowcount:
            self.db.commit()
        return result.rowcount

    def delete(self, partner_id: int) -> int:
        result = self.db.execute(
            delete(Partner).where(Partner.partnerID == partner_id)
        )
        if result.rowcount:
            self.db.commit()
        return result.rowcount

    def getAll(self, only_active: bool = False):
        """
        Mengembalikan semua partner.
        Urutan: kategori ASC (sponsor < media_partner), lalu urutan ASC.
        Jika only_active=True, filter is_active=True saja.
        """
        stmt = select(Partner)
        if only_active:
            stmt = stmt.where(Partner.is_active == True)  # noqa: E712
        stmt = stmt.order_by(asc(Partner.kategori), asc(Partner.urutan))
        rows = self.db.execute(stmt).scalars().all()
        return [
            {
                "partnerID": p.partnerID,
                "fileID": p.fileID,
                "label": p.label,
                "judul": p.judul,
                "deskripsi": p.deskripsi,
                "kategori": p.kategori,
                "urutan": p.urutan,
                "is_active": p.is_active,
            }
            for p in rows
        ]
