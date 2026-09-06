"""Repository for Offer Sponsorship Masuk & Offer Kerja Sama/Job."""

from typing import Optional

from sqlalchemy import or_

from app.models.hr.offer import OfferKerjasamaJob, OfferSponsorshipMasuk
from app.repositories.base import BaseRepository


class OfferSponsorshipRepository(BaseRepository):

    def create(self, **kwargs) -> OfferSponsorshipMasuk:
        entity = OfferSponsorshipMasuk(**kwargs)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get_by_id(self, offer_id: int) -> Optional[OfferSponsorshipMasuk]:
        return self.db.query(OfferSponsorshipMasuk).filter(OfferSponsorshipMasuk.id == offer_id).first()

    def list_all(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[OfferSponsorshipMasuk]:
        query = self.db.query(OfferSponsorshipMasuk)
        if status:
            query = query.filter(OfferSponsorshipMasuk.status == status)
        if search:
            like = f"%{search}%"
            query = query.filter(OfferSponsorshipMasuk.nama_sponsor.ilike(like))
        return query.order_by(OfferSponsorshipMasuk.created_at.desc()).offset(skip).limit(limit).all()

    def count(self, status: Optional[str] = None) -> int:
        query = self.db.query(OfferSponsorshipMasuk)
        if status:
            query = query.filter(OfferSponsorshipMasuk.status == status)
        return query.count()

    def update(self, offer_id: int, **kwargs) -> Optional[OfferSponsorshipMasuk]:
        entity = self.db.query(OfferSponsorshipMasuk).filter(OfferSponsorshipMasuk.id == offer_id).first()
        if entity is None:
            return None
        for key, value in kwargs.items():
            if value is not None:
                setattr(entity, key, value)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, offer_id: int) -> bool:
        entity = self.db.query(OfferSponsorshipMasuk).filter(OfferSponsorshipMasuk.id == offer_id).first()
        if entity is None:
            return False
        self.db.delete(entity)
        self.db.commit()
        return True


class OfferKerjasamaRepository(BaseRepository):

    def create(self, **kwargs) -> OfferKerjasamaJob:
        entity = OfferKerjasamaJob(**kwargs)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get_by_id(self, offer_id: int) -> Optional[OfferKerjasamaJob]:
        return self.db.query(OfferKerjasamaJob).filter(OfferKerjasamaJob.id == offer_id).first()

    def list_all(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[OfferKerjasamaJob]:
        query = self.db.query(OfferKerjasamaJob)
        if status:
            query = query.filter(OfferKerjasamaJob.status == status)
        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(
                    OfferKerjasamaJob.nama_pengaju.ilike(like),
                    OfferKerjasamaJob.kategori.ilike(like),
                )
            )
        return query.order_by(OfferKerjasamaJob.created_at.desc()).offset(skip).limit(limit).all()

    def count(self, status: Optional[str] = None) -> int:
        query = self.db.query(OfferKerjasamaJob)
        if status:
            query = query.filter(OfferKerjasamaJob.status == status)
        return query.count()

    def update(self, offer_id: int, **kwargs) -> Optional[OfferKerjasamaJob]:
        entity = self.db.query(OfferKerjasamaJob).filter(OfferKerjasamaJob.id == offer_id).first()
        if entity is None:
            return None
        for key, value in kwargs.items():
            if value is not None:
                setattr(entity, key, value)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, offer_id: int) -> bool:
        entity = self.db.query(OfferKerjasamaJob).filter(OfferKerjasamaJob.id == offer_id).first()
        if entity is None:
            return False
        self.db.delete(entity)
        self.db.commit()
        return True
