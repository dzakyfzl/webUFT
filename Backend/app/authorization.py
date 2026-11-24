"""Authoritative read model assembling the centralized policy inside a UoW."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import ApiError
from app.organization.models import (BoardMembershipRow, PeriodRow, PositionRow,
                                     UnitMembershipRow, UnitRow, UserRow)
from app.permissions.policy import (Action, Actor, Grant, GrantSource, Membership,
                                    Period, Policy, Position, PositionAssignment,
                                    Program, Unit, UnitType)
from app.programs.models import GrantRow, ProgramRow


def actor_snapshot(session: Session, user_id: str, *, lock: bool = False) -> Actor:
    user = session.get(UserRow, user_id, populate_existing=True, with_for_update=lock)
    if user is None or not user.active:
        raise ApiError(401, "unauthenticated", "Silakan masuk kembali.")
    board = session.scalars(select(BoardMembershipRow).where(
        BoardMembershipRow.user_id == user.id, BoardMembershipRow.active.is_(True))).all()
    memberships = session.scalars(select(UnitMembershipRow).where(UnitMembershipRow.user_id == user.id)).all()
    positions = session.scalars(select(PositionRow).where(PositionRow.user_id == user.id)).all()
    return Actor(user.id, user.active, frozenset(row.period_id for row in board),
                 tuple(Membership(row.unit_id, row.active) for row in memberships),
                 tuple(PositionAssignment(row.period_id, Position(row.position), row.active) for row in positions))


def policy_snapshot(session: Session, program_ids: tuple[str, ...] = ()) -> Policy:
    periods = session.scalars(select(PeriodRow)).all()
    units = session.scalars(select(UnitRow)).all()
    programs = session.scalars(select(ProgramRow).where(ProgramRow.id.in_(program_ids))).all() if program_ids else []
    grants = session.scalars(select(GrantRow).where(GrantRow.program_id.in_(program_ids))).all() if program_ids else []
    return Policy(
        tuple(Period(row.id, row.archived_at is not None) for row in periods),
        tuple(Unit(row.id, row.period_id, UnitType(row.kind), row.parent_id, row.name) for row in units),
        tuple(Program(row.id, row.period_id, row.owner_unit_id, row.chairperson_user_id,
                      row.closed_at is not None, row.name) for row in programs),
        tuple(Grant(row.program_id, row.user_id, GrantSource(row.source), row.source_id, row.active) for row in grants),
    )


def require(session: Session, user_id: str, action: Action, *, period_id: str | None = None,
            program_id: str | None = None, scope=None):
    actor = actor_snapshot(session, user_id, lock=True)
    ids = (program_id,) if program_id else ((scope.resource_id,) if scope and scope.kind == "PROGRAM" else ())
    policy = policy_snapshot(session, ids)
    if not policy.allows(actor, action, period_id=period_id, program_id=program_id, scope=scope):
        raise ApiError(403, "forbidden", "Anda tidak memiliki hak untuk tindakan ini.")
    return actor, policy
