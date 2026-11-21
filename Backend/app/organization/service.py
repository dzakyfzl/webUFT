from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import record_audit
from app.authorization import actor_snapshot, policy_snapshot, require
from app.auth.service import passwords
from app.db import lock_period
from app.errors import ApiError
from app.organization.models import (BoardMembershipRow, MemberRow, PeriodRow,
                                     PositionRow, UnitMembershipRow, UnitRow, UserRow)
from app.permissions.policy import Action, Position


UNIT_SEED = (
    ("UKM", "ORGANIZATION", None),
    ("Departemen Internal", "DEPARTMENT", None),
    ("Departemen Eksternal", "DEPARTMENT", None),
    ("Departemen Asset dan Property", "DEPARTMENT", None),
    ("Hunting", "DIVISION", "Departemen Internal"),
    ("Modeling", "DIVISION", "Departemen Internal"),
    ("Medkom", "DIVISION", "Departemen Eksternal"),
    ("Public Relations", "DIVISION", "Departemen Eksternal"),
    ("Human Resource", "FUNCTION", None),
)
POSITION_UNITS = {
    Position.HEAD_INTERNAL: "Departemen Internal", Position.HEAD_EXTERNAL: "Departemen Eksternal",
    Position.HEAD_ASSET: "Departemen Asset dan Property", Position.HEAD_HUNTING: "Hunting",
    Position.HEAD_MODELING: "Modeling", Position.HEAD_MEDKOM: "Medkom",
    Position.HEAD_PR: "Public Relations", Position.HEAD_HR: "Human Resource",
}


def seed_units(session: Session, period_id: str):
    rows = {}
    for name, kind, parent in UNIT_SEED:
        row = UnitRow(period_id=period_id, name=name, kind=kind,
                      parent_id=rows[parent].id if parent else None)
        session.add(row)
        session.flush()
        rows[name] = row
    return rows


def user_dto(session: Session, user: UserRow):
    member = session.get(MemberRow, user.member_id)
    return {"id": user.id, "member_id": user.member_id, "username": user.username,
            "display_name": member.display_name, "active": user.active}


def has_active_chair(session: Session, period_id: str) -> bool:
    return session.scalar(select(UserRow.id).join(PositionRow, PositionRow.user_id == UserRow.id)
        .join(BoardMembershipRow, BoardMembershipRow.user_id == UserRow.id).where(
            UserRow.active.is_(True), PositionRow.active.is_(True), PositionRow.position == Position.CHAIR.value,
            PositionRow.period_id == period_id, BoardMembershipRow.active.is_(True),
            BoardMembershipRow.period_id == period_id).limit(1)) is not None


def ensure_admin_continuity(session: Session, period_id: str | None = None):
    any_inti = session.scalar(select(UserRow.id).join(PositionRow, PositionRow.user_id == UserRow.id)
        .join(BoardMembershipRow, (BoardMembershipRow.user_id == UserRow.id) & (BoardMembershipRow.period_id == PositionRow.period_id))
        .join(PeriodRow, PeriodRow.id == PositionRow.period_id).where(
            UserRow.active.is_(True), PositionRow.active.is_(True), BoardMembershipRow.active.is_(True),
            PeriodRow.archived_at.is_(None)).limit(1))
    if any_inti is None:
        raise ApiError(409, "last_inti", "Tetapkan pengurus Inti penerus sebelum mencabut akses Inti terakhir.")
    if period_id is not None and not has_active_chair(session, period_id):
        raise ApiError(409, "last_chair", "Tetapkan Ketua Umum pengganti sebelum mencabut akses Ketua Umum terakhir.")


def me(session: Session, user: UserRow, requested_period: str | None):
    actor = actor_snapshot(session, user.id)
    policy = policy_snapshot(session)
    periods = session.scalars(select(PeriodRow).where(
        PeriodRow.id.in_(actor.governing_period_ids), PeriodRow.archived_at.is_(None))
        .order_by(PeriodRow.name.desc())).all()
    if not periods:
        raise ApiError(403, "inactive_board", "Keanggotaan pengurus aktif diperlukan.")
    period = next((row for row in periods if row.id == requested_period), None) if requested_period else periods[0]
    if period is None:
        raise ApiError(403, "forbidden", "Anda bukan pengurus periode ini.")
    effective = policy.effective_units(actor, period.id)
    units = session.scalars(select(UnitRow).where(UnitRow.id.in_(effective))).all()
    return {"user": user_dto(session, user), "period_id": period.id,
            "periods": [{"id": p.id, "name": p.name} for p in periods],
            "units": [{"id": u.id, "name": u.name, "kind": u.kind} for u in units],
            "positions": [p.position.value for p in actor.positions if p.active and p.period_id == period.id],
            "capabilities": {"manage_organization": policy.allows(actor, Action.MANAGE_ORGANIZATION),
                             "create_program": policy.allows(actor, Action.CREATE_PROGRAM, period_id=period.id),
                             "archive_period": policy.allows(actor, Action.ARCHIVE_PERIOD, period_id=period.id)}}


def create_user(session: Session, actor_id: str, body):
    lock_period(session, body.period_id)
    actor, _ = require(session, actor_id, Action.MANAGE_ORGANIZATION)
    if session.scalar(select(UserRow).where(UserRow.username == body.username)):
        raise ApiError(409, "duplicate_username", "Username sudah digunakan.")
    member = session.get(MemberRow, body.member_id, with_for_update=True) if body.member_id else MemberRow(display_name=body.display_name)
    if member is None:
        raise ApiError(404, "not_found", "Anggota tidak ditemukan.")
    if body.member_id and session.scalar(select(UserRow.id).where(UserRow.member_id == member.id)):
        raise ApiError(409, "member_has_account", "Anggota ini sudah memiliki akun. Gunakan akun yang sudah ada.")
    session.add(member)
    session.flush()
    user = UserRow(member_id=member.id, username=body.username, password_hash=passwords.hash(body.password))
    session.add(user)
    session.flush()
    session.add(BoardMembershipRow(user_id=user.id, period_id=body.period_id))
    record_audit(session, actor=actor, action="user.created", resource_id=user.id,
                 after={"username": user.username, "active": True})
    return user_dto(session, user)


def membership(session: Session, actor_id: str, body):
    lock_period(session, body.period_id)
    actor, _ = require(session, actor_id, Action.MANAGE_ORGANIZATION)
    user = session.get(UserRow, body.user_id, with_for_update=True, populate_existing=True)
    if not user:
        raise ApiError(404, "not_found", "Akun tidak ditemukan.")
    had_chair = has_active_chair(session, body.period_id)
    board = session.scalar(select(BoardMembershipRow).where(
        BoardMembershipRow.user_id == user.id, BoardMembershipRow.period_id == body.period_id))
    if board is None:
        board = BoardMembershipRow(user_id=user.id, period_id=body.period_id, active=body.active)
        session.add(board)
    else:
        board.active = body.active
    unit_rows = session.scalars(select(UnitRow).where(UnitRow.id.in_(body.unit_ids))).all()
    if len(unit_rows) != len(set(body.unit_ids)) or any(u.period_id != body.period_id for u in unit_rows):
        raise ApiError(422, "invalid_units", "Keanggotaan unit harus berada pada periode yang sama.")
    existing = session.scalars(select(UnitMembershipRow).join(UnitRow, UnitRow.id == UnitMembershipRow.unit_id).where(
        UnitMembershipRow.user_id == user.id, UnitRow.period_id == body.period_id)).all()
    for row in existing:
        row.active = body.active and row.unit_id in body.unit_ids
    known = {row.unit_id for row in existing}
    for unit in unit_rows:
        if unit.id not in known:
            session.add(UnitMembershipRow(user_id=user.id, unit_id=unit.id, active=body.active))
    positions = session.scalars(select(PositionRow).where(PositionRow.user_id == user.id,
                                                         PositionRow.period_id == body.period_id)).all()
    for row in positions:
        row.active = body.active and row.position in body.positions
    known_positions = {row.position for row in positions}
    for position in body.positions:
        if position not in known_positions:
            session.add(PositionRow(user_id=user.id, period_id=body.period_id, position=position, active=body.active))
    # A head receives explicit membership of their own unit, never sibling units.
    if body.active:
        for position in body.positions:
            unit_name = POSITION_UNITS.get(Position(position))
            if unit_name:
                unit = session.scalar(select(UnitRow).where(UnitRow.period_id == body.period_id, UnitRow.name == unit_name))
                row = next((r for r in existing if r.unit_id == unit.id), None)
                if row:
                    row.active = True
                elif unit.id not in {u.id for u in unit_rows}:
                    session.add(UnitMembershipRow(user_id=user.id, unit_id=unit.id))
    session.flush()
    ensure_admin_continuity(session, body.period_id if had_chair else None)
    record_audit(session, actor=actor, action="membership.updated", resource_id=user.id,
                 period_id=body.period_id, after={"active": body.active, "unit_ids": body.unit_ids,
                                                "positions": [str(p) for p in body.positions]})
    return {"id": user.id}
