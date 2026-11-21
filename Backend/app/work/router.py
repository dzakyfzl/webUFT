from datetime import date, datetime
from enum import StrEnum

from fastapi import APIRouter, Depends, Query
from pydantic import Field
from sqlalchemy import and_, or_, select, func

from app.authorization import policy_snapshot, require
from app.errors import ApiError
from app.http import current_user, transaction
from app.organization.models import PeriodRow, UnitRow
from app.schemas import Input, VersionInput
from app.permissions.policy import Action, ScopeType
from app.programs.models import ProgramRow
from app.work.schemas import ScopeInput
from app.work.repository import task_query
from app.work import service
from app.work.models import TaskRow


router = APIRouter(prefix="/api/admin/tasks", tags=["tasks"])


class Status(StrEnum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    DONE = "DONE"


class TaskFields(Input):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=10000)
    status: Status = Status.TODO
    deadline: date | None = None
    assignee_user_id: str | None = None
    committee_member_id: str | None = None


class TaskInput(TaskFields, ScopeInput):
    pass


class TaskUpdate(TaskFields, VersionInput):
    pass


@router.get("")
def list_tasks(period_id: str, scope_type: ScopeType | None = None, scope_id: str | None = None,
               mine: bool = False, archive: bool = False, status: Status | None = None, offset: int = Query(0, ge=0),
               limit: int = Query(50, ge=1, le=100), user=Depends(current_user), session=Depends(transaction, scope="function")):
    actor, _ = require(session, user.id, Action.READ_PROGRESS, period_id=period_id)
    query = task_query(period_id, archive)
    if mine:
        query = query.where(TaskRow.assignee_user_id == user.id)
    if scope_type == ScopeType.PROGRAM:
        query = query.where(TaskRow.program_id == scope_id)
    elif scope_type == ScopeType.ORGANIZATION:
        query = query.where(TaskRow.scope_type == scope_type.value)
    elif scope_type:
        unit = session.get(UnitRow, scope_id)
        if unit is None or unit.period_id != period_id:
            raise ApiError(422, "invalid_scope", "Unit tidak berada pada periode ini.")
        ids = [unit.id]
        if scope_type == ScopeType.DEPARTMENT:
            ids += list(session.scalars(select(UnitRow.id).where(UnitRow.parent_id == unit.id)))
        query = query.where(or_(TaskRow.unit_id.in_(ids), ProgramRow.owner_unit_id.in_(ids)))
    counts = {value.value: 0 for value in Status}
    counts.update(dict(session.execute(query.with_only_columns(TaskRow.status, func.count()).group_by(TaskRow.status)).all()))
    if status:
        query = query.where(TaskRow.status == status.value)
    rows = session.scalars(query.order_by(TaskRow.deadline.asc().nulls_last(), TaskRow.id).offset(offset).limit(limit + 1)).all()
    policy = policy_snapshot(session, tuple({row.program_id for row in rows if row.program_id}))
    return {"items": [service.task_dto(row, actor, policy) for row in rows[:limit]], "has_more": len(rows) > limit, "counts": counts}


@router.get("/{task_id}")
def get_task(task_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    row = session.get(TaskRow, task_id)
    if row is None or row.deleted_at is not None:
        raise ApiError(404, "not_found", "Tugas tidak ditemukan.")
    actor, _ = require(session, user.id, Action.READ_PROGRESS, period_id=row.period_id)
    policy = policy_snapshot(session, (row.program_id,) if row.program_id else ())
    return service.task_dto(row, actor, policy)


@router.post("", status_code=201)
def create_task(body: TaskInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.task_save(session, user.id, body)


@router.patch("/{task_id}")
def update_task(task_id: str, body: TaskUpdate, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.task_save(session, user.id, body, task_id)


@router.delete("/{task_id}")
def remove_task(task_id: str, body: VersionInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.task_save(session, user.id, body, task_id, True)


class StatusUpdate(VersionInput):
    status: Status


@router.patch("/{task_id}/status")
def update_status(task_id: str, body: StatusUpdate, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.task_status(session, user.id, task_id, body)
