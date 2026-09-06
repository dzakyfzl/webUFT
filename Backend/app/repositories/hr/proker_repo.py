"""Repository for Proker (Program Kerja) and pivot tables."""

from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.hr.proker import Proker, ProkerMedpart, ProkerSponsor
from app.repositories.base import BaseRepository


class ProkerRepository(BaseRepository):

    def create(self, **kwargs) -> Proker:
        entity = Proker(**kwargs)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get_by_id(self, proker_id: int) -> Optional[Proker]:
        return (
            self.db.query(Proker)
            .options(
                joinedload(Proker.medpart_assignments),
                joinedload(Proker.sponsor_assignments),
            )
            .filter(Proker.id == proker_id)
            .first()
        )

    def list_all(self, skip: int = 0, limit: int = 50) -> list[Proker]:
        return (
            self.db.query(Proker)
            .order_by(Proker.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count(self) -> int:
        return self.db.query(Proker).count()

    def update(self, proker_id: int, **kwargs) -> Optional[Proker]:
        entity = self.db.query(Proker).filter(Proker.id == proker_id).first()
        if entity is None:
            return None
        for key, value in kwargs.items():
            setattr(entity, key, value)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, proker_id: int) -> bool:
        entity = self.db.query(Proker).filter(Proker.id == proker_id).first()
        if entity is None:
            return False
        self.db.delete(entity)
        self.db.commit()
        return True

    # ---- Pivot: Medpart ----

    def add_medpart(self, proker_id: int, medpart_id: int, status_kehadiran: Optional[str] = None) -> ProkerMedpart:
        existing = (
            self.db.query(ProkerMedpart)
            .filter(ProkerMedpart.proker_id == proker_id, ProkerMedpart.medpart_id == medpart_id)
            .first()
        )
        if existing:
            return existing
        pivot = ProkerMedpart(proker_id=proker_id, medpart_id=medpart_id, status_kehadiran=status_kehadiran)
        self.db.add(pivot)
        self.db.commit()
        self.db.refresh(pivot)
        return pivot

    def remove_medpart(self, proker_id: int, medpart_id: int) -> bool:
        pivot = (
            self.db.query(ProkerMedpart)
            .filter(ProkerMedpart.proker_id == proker_id, ProkerMedpart.medpart_id == medpart_id)
            .first()
        )
        if pivot is None:
            return False
        self.db.delete(pivot)
        self.db.commit()
        return True

    # ---- Pivot: Sponsor ----

    def add_sponsor(self, proker_id: int, sponsor_id: int, status: Optional[str] = None) -> ProkerSponsor:
        existing = (
            self.db.query(ProkerSponsor)
            .filter(ProkerSponsor.proker_id == proker_id, ProkerSponsor.sponsor_id == sponsor_id)
            .first()
        )
        if existing:
            return existing
        pivot = ProkerSponsor(proker_id=proker_id, sponsor_id=sponsor_id, status=status)
        self.db.add(pivot)
        self.db.commit()
        self.db.refresh(pivot)
        return pivot

    def remove_sponsor(self, proker_id: int, sponsor_id: int) -> bool:
        pivot = (
            self.db.query(ProkerSponsor)
            .filter(ProkerSponsor.proker_id == proker_id, ProkerSponsor.sponsor_id == sponsor_id)
            .first()
        )
        if pivot is None:
            return False
        self.db.delete(pivot)
        self.db.commit()
        return True
