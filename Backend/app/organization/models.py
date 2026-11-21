from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def identifier() -> str:
    return str(uuid4())


class MemberRow(Base):
    __tablename__ = "members"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    display_name: Mapped[str] = mapped_column(String(160))


class UserRow(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    member_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.members.id"), unique=True)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    password_hash: Mapped[str] = mapped_column(String(512))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    session_version: Mapped[int] = mapped_column(default=1)


class PeriodRow(Base):
    __tablename__ = "periods"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_by: Mapped[str | None] = mapped_column(ForeignKey("erp_ukm.users.id"))


class BoardMembershipRow(Base):
    __tablename__ = "board_memberships"
    __table_args__ = (UniqueConstraint("user_id", "period_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    user_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"), index=True)
    period_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.periods.id"), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class UnitRow(Base):
    __tablename__ = "units"
    __table_args__ = (
        UniqueConstraint("id", "period_id"), UniqueConstraint("period_id", "name"),
        CheckConstraint("kind IN ('ORGANIZATION','DEPARTMENT','DIVISION','FUNCTION')", name="unit_kind"),
        CheckConstraint("parent_id IS NULL OR parent_id <> id", name="no_self_parent"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    period_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.periods.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(20))
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("erp_ukm.units.id"))


class UnitMembershipRow(Base):
    __tablename__ = "unit_memberships"
    __table_args__ = (UniqueConstraint("user_id", "unit_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    user_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"), index=True)
    unit_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.units.id"), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class PositionRow(Base):
    __tablename__ = "positions"
    __table_args__ = (UniqueConstraint("user_id", "period_id", "position"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    user_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"), index=True)
    period_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.periods.id"), index=True)
    position: Mapped[str] = mapped_column(String(40))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
