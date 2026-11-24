from fastapi import APIRouter, Depends, Query, Request
from pydantic import Field
from sqlalchemy import or_, select

from app.audit import AuditRow, record_audit
from app.authorization import require
from app.auth.service import COOKIE, authenticate, passwords
from app.errors import ApiError
from app.http import current_user, transaction
from app.organization.models import (BoardMembershipRow, MemberRow, PeriodRow,
                                     PositionRow, UnitMembershipRow, UnitRow, UserRow)
from app.organization.service import active_chair_periods, create_user, ensure_admin_continuity, me, membership, seed_units, user_dto
from app.permissions.policy import Action, Position
from app.schemas import Input


router = APIRouter(prefix="/api/admin", tags=["organization"])


class UserInput(Input):
    username: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9_.-]+$")
    password: str = Field(min_length=12, max_length=256)
    display_name: str = Field(min_length=1, max_length=160)
    period_id: str
    member_id: str | None = None


class UserUpdate(Input):
    active: bool | None = None
    display_name: str | None = Field(default=None, min_length=1, max_length=160)
    password: str | None = Field(default=None, min_length=12, max_length=256)


class MembershipInput(Input):
    user_id: str
    period_id: str
    active: bool = True
    unit_ids: list[str] = Field(default_factory=list, max_length=100)
    positions: list[Position] = Field(default_factory=list, max_length=12)


class NameInput(Input):
    name: str = Field(min_length=1, max_length=120)


@router.get("/me")
def me_route(request: Request, period_id: str | None = None, user=Depends(current_user), session=Depends(transaction, scope="function")):
    result = me(session, user, period_id)
    _, stored = authenticate(session, request.cookies.get(COOKIE))
    return {**result, "csrf_token": stored.csrf_token}


@router.get("/units")
def units_route(period_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    require(session, user.id, Action.READ_PROGRESS, period_id=period_id)
    rows = session.scalars(select(UnitRow).where(UnitRow.period_id == period_id).order_by(UnitRow.name)).all()
    return {"items": [{"id": u.id, "name": u.name, "kind": u.kind, "parent_id": u.parent_id,
                       "period_id": u.period_id} for u in rows]}


@router.get("/directory")
def directory_route(period_id: str, offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500),
                    user=Depends(current_user), session=Depends(transaction, scope="function")):
    require(session, user.id, Action.READ_PROGRESS, period_id=period_id)
    period = session.get(PeriodRow, period_id)
    if period.archived_at is not None:
        event = session.scalar(select(AuditRow).where(AuditRow.resource_id == period_id,
            AuditRow.action == "period.archived").order_by(AuditRow.occurred_at.desc()).limit(1))
        identities = event.after.get("identities", []) if event and event.after else []
        return {"items": identities[offset:offset + limit], "has_more": len(identities) > offset + limit}
    rows = session.scalars(select(UserRow).join(BoardMembershipRow).where(
        BoardMembershipRow.period_id == period_id, BoardMembershipRow.active.is_(True), UserRow.active.is_(True))
        .order_by(UserRow.username, UserRow.id).offset(offset).limit(limit + 1)).all()
    return {"items": [{"id": row.id, "display_name": session.get(MemberRow, row.member_id).display_name}
                      for row in rows[:limit]], "has_more": len(rows) > limit}


@router.get("/users")
def users_route(offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100),
                search: str = Query("", max_length=160),
                user=Depends(current_user), session=Depends(transaction, scope="function")):
    require(session, user.id, Action.MANAGE_ORGANIZATION)
    query = select(UserRow).join(MemberRow)
    if search.strip():
        query = query.where(or_(UserRow.username.icontains(search.strip(), autoescape=True),
                               MemberRow.display_name.icontains(search.strip(), autoescape=True)))
    rows = session.scalars(query.order_by(UserRow.username, UserRow.id).offset(offset).limit(limit + 1)).all()
    return {"items": [user_dto(session, row) for row in rows[:limit]], "has_more": len(rows) > limit}


@router.post("/users", status_code=201)
def create_user_route(body: UserInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return create_user(session, user.id, body)


@router.patch("/users/{user_id}")
def update_user_route(user_id: str, body: UserUpdate, user=Depends(current_user), session=Depends(transaction, scope="function")):
    # Coordinate global identity changes with period archive snapshots.
    session.scalars(select(PeriodRow).order_by(PeriodRow.id).with_for_update()).all()
    actor, _ = require(session, user.id, Action.MANAGE_ORGANIZATION)
    target = session.get(UserRow, user_id, with_for_update=True, populate_existing=True)
    if target is None:
        raise ApiError(404, "not_found", "Akun tidak ditemukan.")
    if target.id == actor.user_id and body.active is False:
        raise ApiError(409, "self_disable", "Gunakan akun Inti lain untuk menonaktifkan akun Anda.")
    member = session.get(MemberRow, target.member_id)
    before = {"active": target.active, "display_name": member.display_name}
    chair_periods = list(session.scalars(select(PeriodRow.id).join(PositionRow, PositionRow.period_id == PeriodRow.id).where(
        PeriodRow.archived_at.is_(None), PositionRow.user_id == target.id,
        PositionRow.position == Position.CHAIR.value, PositionRow.active.is_(True)))) if body.active is False else []
    if body.active is not None:
        target.active = body.active
        target.session_version += 1
    if body.password is not None:
        target.password_hash = passwords.hash(body.password)
        target.session_version += 1
    if body.display_name is not None:
        member.display_name = body.display_name
    session.flush()
    for period_id in chair_periods:
        ensure_admin_continuity(session, period_id)
    record_audit(session, actor=actor, action="user.updated", resource_id=user_id,
                 before=before, after={"active": target.active, "display_name": member.display_name,
                                      "password_reset": body.password is not None})
    return user_dto(session, target)


@router.get("/members")
def members_route(offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100),
                  search: str = Query("", max_length=160), without_account: bool = False,
                  user=Depends(current_user), session=Depends(transaction, scope="function")):
    require(session, user.id, Action.MANAGE_ORGANIZATION)
    query = select(MemberRow)
    if without_account:
        query = query.where(~select(UserRow.id).where(UserRow.member_id == MemberRow.id).exists())
    if search.strip():
        query = query.where(MemberRow.display_name.icontains(search.strip(), autoescape=True))
    rows = session.scalars(query.order_by(MemberRow.display_name, MemberRow.id).offset(offset).limit(limit + 1)).all()
    return {"items": [{"id": row.id, "display_name": row.display_name} for row in rows[:limit]],
            "has_more": len(rows) > limit}


@router.post("/members", status_code=201)
def member_route(body: NameInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    actor, _ = require(session, user.id, Action.MANAGE_ORGANIZATION)
    row = MemberRow(display_name=body.name)
    session.add(row)
    session.flush()
    record_audit(session, actor=actor, action="member.created", resource_id=row.id, after={"display_name": row.display_name})
    return {"id": row.id, "display_name": row.display_name}


@router.put("/memberships")
def membership_route(body: MembershipInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return membership(session, user.id, body)


@router.get("/memberships")
def membership_list(period_id: str, user_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    require(session, user.id, Action.MANAGE_ORGANIZATION)
    board = session.scalar(select(BoardMembershipRow).where(
        BoardMembershipRow.user_id == user_id, BoardMembershipRow.period_id == period_id))
    units = session.scalars(select(UnitMembershipRow).join(UnitRow).where(
        UnitMembershipRow.user_id == user_id, UnitRow.period_id == period_id, UnitMembershipRow.active.is_(True))).all()
    positions = session.scalars(select(PositionRow).where(
        PositionRow.user_id == user_id, PositionRow.period_id == period_id, PositionRow.active.is_(True))).all()
    return {"active": bool(board and board.active), "unit_ids": [r.unit_id for r in units], "positions": [r.position for r in positions]}


@router.get("/periods")
def periods_route(successor_for: str | None = None, user=Depends(current_user), session=Depends(transaction, scope="function")):
    rows = session.scalars(select(PeriodRow).order_by(PeriodRow.name.desc())).all()
    if successor_for:
        require(session, user.id, Action.ARCHIVE_PERIOD, period_id=successor_for)
        ready = set(session.scalars(active_chair_periods()))
    return {"items": [{"id": p.id, "name": p.name, "archived_at": p.archived_at,
                       **({"successor_ready": p.id != successor_for and not p.archived_at and p.id in ready}
                          if successor_for else {})} for p in rows]}


@router.post("/periods", status_code=201)
def create_period_route(body: NameInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    actor, _ = require(session, user.id, Action.MANAGE_ORGANIZATION)
    row = PeriodRow(name=body.name)
    session.add(row)
    session.flush()
    seed_units(session, row.id)
    record_audit(session, actor=actor, action="period.created", resource_id=row.id, period_id=row.id,
                 after={"name": row.name})
    return {"id": row.id, "name": row.name}
