"""Audit Log service — centralized audit trail for all HR modules.

Usage::

    audit_service.log(
        modul="medpart_masuk",
        record_id=42,
        aksi="status_changed",
        user=user_dict,         # from validate_token
        field_key="status",
        nilai_lama="Pending",
        nilai_baru="Approved",
    )
"""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.hr.audit_log import AuditLog


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        modul: str,
        record_id: int,
        aksi: str,
        user: dict,
        field_key: str | None = None,
        nilai_lama: str | None = None,
        nilai_baru: str | None = None,
        via_ai: bool = False,
    ) -> AuditLog:
        entry = AuditLog(
            modul=modul,
            record_id=record_id,
            aksi=aksi,
            user_id=user.get("user_id", 0),
            user_nama=user.get("username", "unknown"),
            field_key=field_key,
            nilai_lama=str(nilai_lama) if nilai_lama is not None else None,
            nilai_baru=str(nilai_baru) if nilai_baru is not None else None,
            via_ai=via_ai,
        )
        self.db.add(entry)
        # Don't commit here — let the calling service handle the transaction
        return entry

    def get_logs_for_record(self, modul: str, record_id: int) -> list[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.modul == modul, AuditLog.record_id == record_id)
            .order_by(AuditLog.created_at.desc())
            .all()
        )

    def _apply_global_filters(self, query, modul, user_id, date_from, date_to):
        if modul:
            query = query.filter(AuditLog.modul == modul)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if date_from:
            query = query.filter(AuditLog.created_at >= date_from)
        if date_to:
            query = query.filter(AuditLog.created_at <= date_to)
        return query

    def get_global_logs(
        self,
        modul: Optional[str] = None,
        user_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[AuditLog]:
        query = self.db.query(AuditLog)
        query = self._apply_global_filters(query, modul, user_id, date_from, date_to)
        return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    def count_global_logs(
        self,
        modul: Optional[str] = None,
        user_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> int:
        query = self.db.query(AuditLog)
        query = self._apply_global_filters(query, modul, user_id, date_from, date_to)
        return query.count()

    def get_distinct_moduls(self) -> list[str]:
        rows = self.db.query(AuditLog.modul).distinct().order_by(AuditLog.modul).all()
        return [r[0] for r in rows]

