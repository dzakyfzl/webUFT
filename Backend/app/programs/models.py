from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (CheckConstraint, Date, DateTime, ForeignKey, ForeignKeyConstraint,
                        Numeric, String, Text, UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.organization.models import identifier


class ProgramRow(Base):
    __tablename__ = "programs"
    __table_args__ = (
        UniqueConstraint("id", "period_id"),
        ForeignKeyConstraint(["owner_unit_id", "period_id"], ["erp_ukm.units.id", "erp_ukm.units.period_id"]),
        CheckConstraint("ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on", name="program_dates"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    period_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.periods.id"), index=True)
    owner_unit_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    chairperson_name: Mapped[str] = mapped_column(String(160))
    chairperson_user_id: Mapped[str | None] = mapped_column(ForeignKey("erp_ukm.users.id"))
    created_by: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    starts_on: Mapped[date | None] = mapped_column(Date)
    ends_on: Mapped[date | None] = mapped_column(Date)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(default=1)


class GrantRow(Base):
    __tablename__ = "program_grants"
    __table_args__ = (
        UniqueConstraint("program_id", "user_id", "source", "source_id"),
        CheckConstraint("source IN ('CREATOR','CHAIRPERSON','MANUAL','TASK_PIC')", name="grant_source"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    program_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.programs.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"), index=True)
    source: Mapped[str] = mapped_column(String(20))
    source_id: Mapped[str] = mapped_column(String(36))
    active: Mapped[bool] = mapped_column(default=True)


class CommitteeGroupRow(Base):
    __tablename__ = "committee_groups"
    __table_args__ = (
        UniqueConstraint("id", "program_id"),
        ForeignKeyConstraint(["parent_id", "program_id"], ["erp_ukm.committee_groups.id", "erp_ukm.committee_groups.program_id"]),
        CheckConstraint("parent_id IS NULL OR parent_id <> id", name="group_no_self_parent"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    program_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.programs.id"), index=True)
    parent_id: Mapped[str | None] = mapped_column(String(36))
    label: Mapped[str] = mapped_column(String(120))
    sort_order: Mapped[int] = mapped_column(default=0)


class CommitteeMemberRow(Base):
    __tablename__ = "committee_members"
    __table_args__ = (
        UniqueConstraint("id", "program_id"),
        ForeignKeyConstraint(["group_id", "program_id"], ["erp_ukm.committee_groups.id", "erp_ukm.committee_groups.program_id"]),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    program_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.programs.id"), index=True)
    group_id: Mapped[str | None] = mapped_column(String(36))
    display_name: Mapped[str] = mapped_column(String(160))
    role: Mapped[str] = mapped_column(String(120))
    user_id: Mapped[str | None] = mapped_column(ForeignKey("erp_ukm.users.id"))


class BudgetRow(Base):
    __tablename__ = "budget_lines"
    __table_args__ = (
        CheckConstraint("quantity > 0 AND unit_price >= 0", name="budget_values"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    program_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.programs.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(100), default="")
    quantity: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    unit: Mapped[str] = mapped_column(String(80))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    notes: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[int] = mapped_column(default=1)
