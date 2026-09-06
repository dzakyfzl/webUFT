"""Repository for Reminder and Overdue Engine."""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.hr.reminder import Reminder
from app.repositories.base import BaseRepository


class ReminderRepository(BaseRepository):

    def create(self, **kwargs) -> Reminder:
        entity = Reminder(**kwargs)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get_by_id(self, reminder_id: int) -> Optional[Reminder]:
        return self.db.query(Reminder).filter(Reminder.id == reminder_id).first()

    def list_all(
        self,
        jenis: Optional[str] = None,
        status: Optional[str] = None,
        assigned_to: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Reminder]:
        query = self.db.query(Reminder)
        if jenis:
            query = query.filter(Reminder.jenis == jenis)
        if status:
            query = query.filter(Reminder.status == status)
        if assigned_to:
            query = query.filter(Reminder.assigned_to == assigned_to)
        return query.order_by(Reminder.tanggal_deadline.asc()).offset(skip).limit(limit).all()

    def count(
        self,
        status: Optional[str] = None,
        assigned_to: Optional[int] = None,
    ) -> int:
        query = self.db.query(Reminder)
        if status:
            query = query.filter(Reminder.status == status)
        if assigned_to:
            query = query.filter(Reminder.assigned_to == assigned_to)
        return query.count()

    def update(self, reminder_id: int, **kwargs) -> Optional[Reminder]:
        entity = self.db.query(Reminder).filter(Reminder.id == reminder_id).first()
        if entity is None:
            return None
        for key, value in kwargs.items():
            setattr(entity, key, value)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, reminder_id: int) -> bool:
        entity = self.db.query(Reminder).filter(Reminder.id == reminder_id).first()
        if entity is None:
            return False
        self.db.delete(entity)
        self.db.commit()
        return True

    def mark_overdue(self) -> int:
        """Update semua Reminder Aktif yang sudah melewati deadline menjadi Overdue.

        Returns jumlah record yang diupdate.
        """
        now = datetime.utcnow()
        entities = (
            self.db.query(Reminder)
            .filter(
                Reminder.status == "Aktif",
                Reminder.tanggal_deadline < now,
            )
            .all()
        )
        for e in entities:
            e.status = "Overdue"
        if entities:
            self.db.commit()
        return len(entities)

    def get_dashboard_sections(self) -> dict:
        """Return 3 section untuk dashboard: Overdue, Mendekati, Akan Datang."""
        now = datetime.utcnow()
        from datetime import timedelta
        soon_threshold = now + timedelta(days=3)

        overdue = (
            self.db.query(Reminder)
            .filter(Reminder.status == "Overdue")
            .order_by(Reminder.tanggal_deadline.asc())
            .limit(20)
            .all()
        )
        mendekati = (
            self.db.query(Reminder)
            .filter(
                Reminder.status == "Aktif",
                Reminder.tanggal_deadline <= soon_threshold,
                Reminder.tanggal_deadline >= now,
            )
            .order_by(Reminder.tanggal_deadline.asc())
            .limit(20)
            .all()
        )
        akan_datang = (
            self.db.query(Reminder)
            .filter(
                Reminder.status == "Aktif",
                Reminder.tanggal_deadline > soon_threshold,
            )
            .order_by(Reminder.tanggal_deadline.asc())
            .limit(20)
            .all()
        )
        return {
            "overdue": overdue,
            "mendekati": mendekati,
            "akan_datang": akan_datang,
        }
