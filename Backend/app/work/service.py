from datetime import datetime, timezone

from sqlalchemy import select, update

from app.audit import record_audit
from app.authorization import actor_snapshot, require
from app.db import lock_period
from app.errors import ApiError
from app.permissions.policy import Action, GrantSource, Scope, ScopeType
from app.programs.models import CommitteeMemberRow, GrantRow
from app.programs.service import ensure_version, lock_program, set_grant
from app.work.models import AgendaRow, TaskRow


def scope_of(row):
    return Scope(ScopeType(row.scope_type), row.period_id, row.program_id or row.unit_id)


def lock_scope(session, *, period_id, program_id=None):
    lock_period(session, period_id)
    if program_id:
        program = lock_program(session, program_id)
        if program.period_id != period_id:
            raise ApiError(422, "scope_period", "Scope harus berada pada periode yang sama.")


def scope_values(body):
    scope = Scope(body.scope_type, body.period_id, body.scope_id)
    return scope, {"period_id": body.period_id, "scope_type": str(body.scope_type),
                   "program_id": body.scope_id if body.scope_type == ScopeType.PROGRAM else None,
                   "unit_id": body.scope_id if body.scope_type in (ScopeType.DEPARTMENT, ScopeType.DIVISION) else None}


def pic(session, policy, period_id, program_id, user_id, committee_id):
    if committee_id:
        member = session.get(CommitteeMemberRow, committee_id)
        if member is None or member.program_id != program_id:
            raise ApiError(422, "foreign_pic", "Panitia PIC harus berasal dari Proker yang sama.")
        if user_id and member.user_id != user_id:
            raise ApiError(422, "conflicting_pic", "Akun PIC berbeda dengan akun panitia yang dipilih.")
        user_id = user_id or member.user_id
    if user_id and not policy.current_member(actor_snapshot(session, user_id), period_id):
        raise ApiError(422, "inactive_pic", "PIC berakun harus pengurus aktif pada periode ini.")
    return user_id


def task_dto(row, actor, policy):
    board = policy.program(row.program_id) if row.program_id else policy.unit(row.unit_id)
    return {"id": row.id, "period_id": row.period_id, "scope_type": row.scope_type,
            "scope_id": row.program_id or row.unit_id, "program_id": row.program_id,
            "board_name": board.name if board else "Umum UKM",
            "unit_id": row.unit_id, "title": row.title, "description": row.description,
            "status": row.status, "deadline": row.deadline, "assignee_user_id": row.assignee_user_id,
            "committee_member_id": row.committee_member_id, "version": row.version,
            "can_edit": policy.allows(actor, Action.EDIT_SCOPED_RECORD, scope=scope_of(row))}


def task_save(session, user_id, body, task_id=None, remove=False):
    row = session.get(TaskRow, task_id) if task_id else None
    if task_id and (row is None or row.deleted_at is not None):
        raise ApiError(404, "not_found", "Tugas tidak ditemukan.")
    if row:
        lock_scope(session, period_id=row.period_id, program_id=row.program_id)
        row = session.get(TaskRow, task_id, with_for_update=True, populate_existing=True)
        scope = scope_of(row)
    else:
        scope, values = scope_values(body)
        lock_scope(session, period_id=scope.period_id, program_id=values["program_id"])
    actor, policy = require(session, user_id, Action.EDIT_SCOPED_RECORD, scope=scope)
    resolved_pic = None
    if not remove:
        # Resolve the account before adding an incomplete task to the Session:
        # authorization queries can trigger SQLAlchemy autoflush.
        resolved_pic = pic(session, policy, scope.period_id,
                           scope.resource_id if scope.kind == ScopeType.PROGRAM else None,
                           body.assignee_user_id, body.committee_member_id)
    before = None if row is None else {"title": row.title, "description": row.description,
        "status": row.status, "assignee_user_id": row.assignee_user_id,
        "committee_member_id": row.committee_member_id, "deadline": str(row.deadline) if row.deadline else None}
    if row:
        ensure_version(row, body.expected_version)
        row.version += 1
    else:
        row = TaskRow(**values, created_by=user_id)
        session.add(row)
    if remove:
        row.deleted_at = datetime.now(timezone.utc)
    else:
        row.assignee_user_id = resolved_pic
        row.title, row.description, row.status = body.title, body.description, str(body.status)
        row.deadline, row.committee_member_id = body.deadline, body.committee_member_id
    session.flush()
    # Replacing PIC retires only this task's grant, preserving other sources.
    if row.program_id:
        session.execute(update(GrantRow).where(GrantRow.program_id == row.program_id,
            GrantRow.source == GrantSource.TASK_PIC.value, GrantRow.source_id == row.id).values(active=False))
        if row.assignee_user_id and not remove:
            set_grant(session, program_id=row.program_id, user_id=row.assignee_user_id,
                      source=GrantSource.TASK_PIC, source_id=row.id)
    after = None if remove else {"title": row.title, "description": row.description,
        "status": row.status, "assignee_user_id": row.assignee_user_id,
        "committee_member_id": row.committee_member_id, "deadline": str(row.deadline) if row.deadline else None,
        "program_grant": {"source": "TASK_PIC", "source_id": row.id, "user_id": row.assignee_user_id} if row.program_id and row.assignee_user_id else None}
    record_audit(session, actor=actor, action="task.removed" if remove else "task.saved", resource_id=row.id,
                 period_id=row.period_id, before=before, after=after)
    return {"id": row.id} if remove else task_dto(row, actor, policy)


def agenda_dto(row, actor, policy):
    return {"id": row.id, "source": "AGENDA", "title": row.title,
            "period_id": row.period_id, "scope_type": row.scope_type,
            "scope_id": row.program_id or row.unit_id, "program_id": row.program_id,
            "starts_at": row.starts_at, "ends_at": row.ends_at, "version": row.version,
            "can_edit": policy.allows(actor, Action.EDIT_SCOPED_RECORD, scope=scope_of(row))}


def agenda_save(session, user_id, body, agenda_id=None, remove=False):
    row = session.get(AgendaRow, agenda_id) if agenda_id else None
    if agenda_id and (row is None or row.deleted_at is not None):
        raise ApiError(404, "not_found", "Agenda tidak ditemukan.")
    if row:
        lock_scope(session, period_id=row.period_id, program_id=row.program_id)
        row = session.get(AgendaRow, agenda_id, with_for_update=True, populate_existing=True)
        scope = scope_of(row)
    else:
        scope, values = scope_values(body)
        lock_scope(session, period_id=scope.period_id, program_id=values["program_id"])
    actor, policy = require(session, user_id, Action.EDIT_SCOPED_RECORD, scope=scope)
    before = None if row is None else {"title": row.title, "starts_at": row.starts_at.isoformat(), "ends_at": row.ends_at.isoformat()}
    if row:
        ensure_version(row, body.expected_version)
        row.version += 1
    else:
        row = AgendaRow(**values, created_by=user_id)
        session.add(row)
    if remove:
        row.deleted_at = datetime.now(timezone.utc)
    else:
        if (body.starts_at.tzinfo is None or body.starts_at.utcoffset() is None
                or body.ends_at.tzinfo is None or body.ends_at.utcoffset() is None or body.ends_at < body.starts_at):
            raise ApiError(422, "invalid_dates", "Agenda memerlukan zona waktu dan rentang tanggal yang valid.")
        row.title, row.starts_at, row.ends_at = body.title, body.starts_at, body.ends_at
    session.flush()
    record_audit(session, actor=actor, action="agenda.removed" if remove else "agenda.saved", resource_id=row.id,
        period_id=row.period_id, before=before, after=None if remove else {"title": row.title,
            "starts_at": row.starts_at.isoformat(), "ends_at": row.ends_at.isoformat()})
    return {"id": row.id} if remove else agenda_dto(row, actor, policy)


def task_status(session, user_id, task_id, body):
    row = session.get(TaskRow, task_id)
    if row is None or row.deleted_at is not None:
        raise ApiError(404, "not_found", "Tugas tidak ditemukan.")
    lock_scope(session, period_id=row.period_id, program_id=row.program_id)
    row = session.get(TaskRow, task_id, with_for_update=True, populate_existing=True)
    if row is None or row.deleted_at is not None:
        raise ApiError(404, "not_found", "Tugas tidak ditemukan.")
    actor, policy = require(session, user_id, Action.EDIT_SCOPED_RECORD, scope=scope_of(row))
    ensure_version(row, body.expected_version)
    if row.status != body.status:
        before = {"status": row.status}
        row.status = str(body.status)
        row.version += 1
        record_audit(session, actor=actor, action="task.status_changed", resource_id=row.id,
                     period_id=row.period_id, before=before, after={"status": row.status})
        session.flush()
    return task_dto(row, actor, policy)
