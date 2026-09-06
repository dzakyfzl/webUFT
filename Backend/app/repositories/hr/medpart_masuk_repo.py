"""Repository for Medpart Masuk (Inbound)."""

from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.hr.medpart import MedpartMasuk, MedpartMasukNote
from app.repositories.base import BaseRepository


class MedpartMasukRepository(BaseRepository):

    def create(self, **kwargs) -> MedpartMasuk:
        entity = MedpartMasuk(**kwargs)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get_by_id(self, medpart_id: int) -> Optional[MedpartMasuk]:
        return (
            self.db.query(MedpartMasuk)
            .options(joinedload(MedpartMasuk.notes))
            .filter(MedpartMasuk.id == medpart_id)
            .first()
        )

    def list_all(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[MedpartMasuk]:
        query = self.db.query(MedpartMasuk)
        if status:
            query = query.filter(MedpartMasuk.status == status)
        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(
                    MedpartMasuk.nama.ilike(like),
                    MedpartMasuk.platform.ilike(like),
                    MedpartMasuk.kontak.ilike(like),
                )
            )
        return query.order_by(MedpartMasuk.created_at.desc()).offset(skip).limit(limit).all()

    def count(self, status: Optional[str] = None) -> int:
        query = self.db.query(MedpartMasuk)
        if status:
            query = query.filter(MedpartMasuk.status == status)
        return query.count()

    def update(self, medpart_id: int, **kwargs) -> Optional[MedpartMasuk]:
        entity = self.db.query(MedpartMasuk).filter(MedpartMasuk.id == medpart_id).first()
        if entity is None:
            return None
        for key, value in kwargs.items():
            if value is not None:
                setattr(entity, key, value)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, medpart_id: int) -> bool:
        entity = self.db.query(MedpartMasuk).filter(MedpartMasuk.id == medpart_id).first()
        if entity is None:
            return False
        self.db.delete(entity)
        self.db.commit()
        return True

    def add_note(self, medpart_id: int, content: str, created_by: int) -> MedpartMasukNote:
        note = MedpartMasukNote(medpart_id=medpart_id, content=content, created_by=created_by)
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note
