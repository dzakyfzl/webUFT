"""Repository for Undangan (Invitation) and multi-assignee."""

from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.hr.undangan import Undangan, UndanganAssignment
from app.repositories.base import BaseRepository


class UndanganRepository(BaseRepository):

    def create(self, **kwargs) -> Undangan:
        entity = Undangan(**kwargs)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get_by_id(self, undangan_id: int) -> Optional[Undangan]:
        return (
            self.db.query(Undangan)
            .options(joinedload(Undangan.assignments))
            .filter(Undangan.id == undangan_id)
            .first()
        )

    def list_all(
        self,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Undangan]:
        query = self.db.query(Undangan)
        if status:
            query = query.filter(Undangan.status == status)
        return query.order_by(Undangan.tanggal.asc().nullslast()).offset(skip).limit(limit).all()

    def count(self, status: Optional[str] = None) -> int:
        query = self.db.query(Undangan)
        if status:
            query = query.filter(Undangan.status == status)
        return query.count()

    def update(self, undangan_id: int, **kwargs) -> Optional[Undangan]:
        entity = self.db.query(Undangan).filter(Undangan.id == undangan_id).first()
        if entity is None:
            return None
        for key, value in kwargs.items():
            setattr(entity, key, value)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, undangan_id: int) -> bool:
        entity = self.db.query(Undangan).filter(Undangan.id == undangan_id).first()
        if entity is None:
            return False
        self.db.delete(entity)
        self.db.commit()
        return True

    # ---- Assignments ----

    def assign(self, undangan_id: int, akun_id: int) -> UndanganAssignment:
        existing = (
            self.db.query(UndanganAssignment)
            .filter(
                UndanganAssignment.undangan_id == undangan_id,
                UndanganAssignment.akun_id == akun_id,
            )
            .first()
        )
        if existing:
            return existing
        a = UndanganAssignment(undangan_id=undangan_id, akun_id=akun_id)
        self.db.add(a)
        self.db.commit()
        self.db.refresh(a)
        return a

    def unassign(self, undangan_id: int, akun_id: int) -> bool:
        a = (
            self.db.query(UndanganAssignment)
            .filter(
                UndanganAssignment.undangan_id == undangan_id,
                UndanganAssignment.akun_id == akun_id,
            )
            .first()
        )
        if a is None:
            return False
        self.db.delete(a)
        self.db.commit()
        return True

    def update_kehadiran(self, undangan_id: int, akun_id: int, status: str) -> Optional[UndanganAssignment]:
        a = (
            self.db.query(UndanganAssignment)
            .filter(
                UndanganAssignment.undangan_id == undangan_id,
                UndanganAssignment.akun_id == akun_id,
            )
            .first()
        )
        if a is None:
            return None
        a.status_kehadiran = status
        self.db.commit()
        self.db.refresh(a)
        return a
