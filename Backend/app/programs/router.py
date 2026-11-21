from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import Field
from sqlalchemy import exists, func, select

from app.authorization import actor_snapshot, policy_snapshot, require
from app.audit import AuditRow
from app.errors import ApiError
from app.http import current_user, transaction
from app.organization.models import PeriodRow
from app.schemas import Input
from app.permissions.policy import Action
from app.programs import service
from app.programs.models import GrantRow, ProgramRow
from app.work.models import TaskRow


router = APIRouter(prefix="/api/admin/programs", tags=["programs"])


class ProgramInput(Input):
    period_id: str
    owner_unit_id: str
    name: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=10000)
    chairperson_name: str = Field(min_length=1, max_length=160)
    chairperson_user_id: str | None = None
    starts_on: date | None = None
    ends_on: date | None = None


class ProgramUpdate(Input):
    expected_version: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=10000)
    starts_on: date | None = None
    ends_on: date | None = None


class CloseInput(Input):
    expected_version: int = Field(ge=1)
    confirmed_unfinished: bool = False


class ChairInput(Input):
    expected_version: int = Field(ge=1)
    chairperson_name: str = Field(min_length=1, max_length=160)
    chairperson_user_id: str | None = None


class AssignmentInput(Input):
    user_id: str


@router.get("")
def list_programs(period_id: str, view: str = Query("all", pattern="^(all|mine|archive)$"),
                  offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100),
                  user=Depends(current_user), session=Depends(transaction, scope="function")):
    actor, _ = require(session, user.id, Action.READ_PROGRESS, period_id=period_id)
    query = select(ProgramRow).join(PeriodRow).where(ProgramRow.period_id == period_id)
    if view == "archive":
        query = query.where((ProgramRow.closed_at.is_not(None)) | (PeriodRow.archived_at.is_not(None)))
    else:
        query = query.where(ProgramRow.closed_at.is_(None), PeriodRow.archived_at.is_(None))
    if view == "mine":
        query = query.where(exists(select(GrantRow.id).where(GrantRow.program_id == ProgramRow.id,
            GrantRow.user_id == user.id, GrantRow.active.is_(True))))
    rows = session.scalars(query.order_by(ProgramRow.created_at.desc(), ProgramRow.id).offset(offset).limit(limit + 1)).all()
    policy = policy_snapshot(session, tuple(row.id for row in rows))
    return {"items": [service.program_dto(row, actor, policy) for row in rows[:limit]], "has_more": len(rows) > limit}


@router.post("", status_code=201)
def create_program(body: ProgramInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.create(session, user.id, body)


@router.get("/{program_id}")
def get_program(program_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    row = session.get(ProgramRow, program_id)
    if row is None:
        raise ApiError(404, "not_found", "Proker tidak ditemukan.")
    actor, policy = require(session, user.id, Action.READ_PROGRESS, program_id=program_id)
    remaining = session.scalar(select(func.count()).select_from(TaskRow).where(
        TaskRow.program_id == row.id, TaskRow.deleted_at.is_(None), TaskRow.status != "DONE"))
    grants = session.scalars(select(GrantRow).where(GrantRow.program_id == row.id, GrantRow.active.is_(True))).all()
    return {**service.program_dto(row, actor, policy), "unfinished_tasks": remaining,
            "assignments": [{"user_id": g.user_id, "source": g.source, "source_id": g.source_id} for g in grants]}


@router.get("/{program_id}/activity")
def program_activity(program_id: str, offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100),
                     user=Depends(current_user), session=Depends(transaction, scope="function")):
    require(session, user.id, Action.READ_PROGRESS, program_id=program_id)
    task_ids = select(TaskRow.id).where(TaskRow.program_id == program_id)
    rows = session.scalars(select(AuditRow).where((AuditRow.resource_id == program_id) | AuditRow.resource_id.in_(task_ids))
        .order_by(AuditRow.occurred_at.desc(), AuditRow.id).offset(offset).limit(limit + 1)).all()
    return {"items": [{"id": row.id, "actor_name": row.actor_name, "actor_positions": row.actor_positions,
                       "occurred_at": row.occurred_at, "action": row.action, "before": row.before,
                       "after": row.after} for row in rows[:limit]], "has_more": len(rows) > limit}


@router.patch("/{program_id}")
def edit_program(program_id: str, body: ProgramUpdate, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.edit(session, user.id, program_id, body)


@router.post("/{program_id}/close")
def close_program(program_id: str, body: CloseInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.close(session, user.id, program_id, body)


@router.put("/{program_id}/chairperson")
def change_chairperson(program_id: str, body: ChairInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.change_chairperson(session, user.id, program_id, body)


@router.post("/{program_id}/assignments")
def assign(program_id: str, body: AssignmentInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.manual_assignment(session, user.id, program_id, body.user_id, True)


@router.delete("/{program_id}/assignments/{user_id}")
def revoke(program_id: str, user_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.manual_assignment(session, user.id, program_id, user_id, False)
