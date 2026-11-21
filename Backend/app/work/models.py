from datetime import date, datetime

from sqlalchemy import (CheckConstraint, Date, DateTime, ForeignKey, ForeignKeyConstraint,
                        String, Text)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.organization.models import identifier


def scope_constraints():
    return (
        ForeignKeyConstraint(["unit_id", "period_id"], ["erp_ukm.units.id", "erp_ukm.units.period_id"]),
        ForeignKeyConstraint(["program_id", "period_id"], ["erp_ukm.programs.id", "erp_ukm.programs.period_id"]),
        CheckConstraint("(scope_type = 'ORGANIZATION' AND unit_id IS NULL AND program_id IS NULL) OR "
                        "(scope_type IN ('DEPARTMENT','DIVISION') AND unit_id IS NOT NULL AND program_id IS NULL) OR "
                        "(scope_type = 'PROGRAM' AND unit_id IS NULL AND program_id IS NOT NULL)", name="exactly_one_scope"),
    )


class TaskRow(Base):
    __tablename__ = "tasks"
    __table_args__ = (*scope_constraints(),
        ForeignKeyConstraint(["committee_member_id", "program_id"], ["erp_ukm.committee_members.id", "erp_ukm.committee_members.program_id"]),
        CheckConstraint("committee_member_id IS NULL OR program_id IS NOT NULL", name="committee_program_required"),
        CheckConstraint("status IN ('TODO','IN_PROGRESS','REVIEW','DONE')", name="task_status"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    period_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.periods.id"), index=True)
    scope_type: Mapped[str] = mapped_column(String(20))
    unit_id: Mapped[str | None] = mapped_column(String(36), index=True)
    program_id: Mapped[str | None] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="TODO", index=True)
    assignee_user_id: Mapped[str | None] = mapped_column(ForeignKey("erp_ukm.users.id"), index=True)
    committee_member_id: Mapped[str | None] = mapped_column(String(36))
    deadline: Mapped[date | None] = mapped_column(Date, index=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"))
    version: Mapped[int] = mapped_column(default=1)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AgendaRow(Base):
    __tablename__ = "calendar_events"
    __table_args__ = (*scope_constraints(),
                     CheckConstraint("ends_at >= starts_at", name="agenda_dates"))
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    period_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.periods.id"), index=True)
    scope_type: Mapped[str] = mapped_column(String(20))
    unit_id: Mapped[str | None] = mapped_column(String(36), index=True)
    program_id: Mapped[str | None] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(160))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"))
    version: Mapped[int] = mapped_column(default=1)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
