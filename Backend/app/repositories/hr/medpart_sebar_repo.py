"""Repository for Medpart Sebar (Outbound)."""

from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import joinedload

from app.models.hr.medpart_sebar import MedpartSebar, MedpartSebarNote
from app.repositories.base import BaseRepository


class MedpartSebarRepository(BaseRepository):

    def create(self, **kwargs) -> MedpartSebar:
        entity = MedpartSebar(**kwargs)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get_by_id(self, medpart_id: int) -> Optional[MedpartSebar]:
        return (
            self.db.query(MedpartSebar)
            .options(joinedload(MedpartSebar.notes))
            .filter(MedpartSebar.id == medpart_id)
            .first()
        )

    def list_all(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[MedpartSebar]:
        query = self.db.query(MedpartSebar)
        if status:
            query = query.filter(MedpartSebar.status == status)
        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(
                    MedpartSebar.nama.ilike(like),
                    MedpartSebar.platform.ilike(like),
                    MedpartSebar.kontak_wa.ilike(like),
                    MedpartSebar.pic.ilike(like),
                )
            )
        return query.order_by(MedpartSebar.created_at.desc()).offset(skip).limit(limit).all()

    def count(self, status: Optional[str] = None) -> int:
        query = self.db.query(MedpartSebar)
        if status:
            query = query.filter(MedpartSebar.status == status)
        return query.count()

    def update(self, medpart_id: int, **kwargs) -> Optional[MedpartSebar]:
        entity = self.db.query(MedpartSebar).filter(MedpartSebar.id == medpart_id).first()
        if entity is None:
            return None
        for key, value in kwargs.items():
            if value is not None:
                setattr(entity, key, value)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, medpart_id: int) -> bool:
        entity = self.db.query(MedpartSebar).filter(MedpartSebar.id == medpart_id).first()
        if entity is None:
            return False
        self.db.delete(entity)
        self.db.commit()
        return True

    def add_note(self, medpart_id: int, content: str, created_by: int) -> MedpartSebarNote:
        note = MedpartSebarNote(medpart_sebar_id=medpart_id, content=content, created_by=created_by)
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note
