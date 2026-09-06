"""Repository for Jadwal Poster (Media Partner Posting Schedule)."""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.hr.jadwal_poster import JadwalPoster
from app.repositories.base import BaseRepository


class JadwalPosterRepository(BaseRepository):

    def create(self, **kwargs) -> JadwalPoster:
        entity = JadwalPoster(**kwargs)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get_by_id(self, jadwal_id: int) -> Optional[JadwalPoster]:
        return (
            self.db.query(JadwalPoster)
            .filter(JadwalPoster.id == jadwal_id)
            .first()
        )

    def list_all(
        self,
        medpart_id: Optional[int] = None,
        proker_id: Optional[int] = None,
        status: Optional[str] = None,
        overdue_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> list[JadwalPoster]:
        query = self.db.query(JadwalPoster)
        if medpart_id:
            query = query.filter(JadwalPoster.medpart_id == medpart_id)
        if proker_id:
            query = query.filter(JadwalPoster.proker_id == proker_id)
        if status:
            query = query.filter(JadwalPoster.status == status)
        if overdue_only:
            query = query.filter(JadwalPoster.status == "Telat")
        return query.order_by(JadwalPoster.tanggal_deadline.asc()).offset(skip).limit(limit).all()

    def count(
        self,
        medpart_id: Optional[int] = None,
        status: Optional[str] = None,
    ) -> int:
        query = self.db.query(JadwalPoster)
        if medpart_id:
            query = query.filter(JadwalPoster.medpart_id == medpart_id)
        if status:
            query = query.filter(JadwalPoster.status == status)
        return query.count()

    def update(self, jadwal_id: int, **kwargs) -> Optional[JadwalPoster]:
        entity = self.db.query(JadwalPoster).filter(JadwalPoster.id == jadwal_id).first()
        if entity is None:
            return None
        for key, value in kwargs.items():
            setattr(entity, key, value)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, jadwal_id: int) -> bool:
        entity = self.db.query(JadwalPoster).filter(JadwalPoster.id == jadwal_id).first()
        if entity is None:
            return False
        self.db.delete(entity)
        self.db.commit()
        return True

    def mark_overdue(self) -> int:
        """Tandai semua jadwal yang deadline-nya sudah lewat dan belum upload sebagai Telat.
        
        Returns jumlah record yang diupdate.
        """
        now = datetime.utcnow()
        result = (
            self.db.query(JadwalPoster)
            .filter(
                JadwalPoster.tanggal_deadline < now,
                JadwalPoster.status.in_(["Belum Jadwal", "Terjadwal"]),
            )
            .all()
        )
        count = 0
        for entity in result:
            entity.status = "Telat"
            count += 1
        if count:
            self.db.commit()
        return count
