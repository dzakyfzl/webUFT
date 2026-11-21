from sqlalchemy import select

from app.authorization import require
from app.db import lock_period
from app.errors import ApiError
from app.organization.models import PeriodRow, UnitRow
from app.permissions.policy import Action
from app.programs.models import ProgramRow
from app.programs.service import lock_program
from app.p1.models import EventRow, EventStaffRow


def program_access(session, user_id, program_id, *, write=False):
    row = lock_program(session, program_id) if write else session.get(ProgramRow, program_id)
    if row is None:
        raise ApiError(404, "not_found", "Proker tidak ditemukan.")
    actor, policy = require(session, user_id, Action.EDIT_PROGRAM if write else Action.READ_PROGRESS,
                            program_id=program_id, period_id=row.period_id)
    return row, actor, policy


def inventory_access(session, user_id, period_id, *, manage=False):
    if manage:
        lock_period(session, period_id)
    actor, policy = require(session, user_id, Action.READ_PROGRESS, period_id=period_id)
    asset_units = {row.id for row in session.scalars(select(UnitRow).where(
        UnitRow.period_id == period_id, UnitRow.name == "Departemen Asset dan Property"))}
    allowed = bool(policy.effective_units(actor, period_id) & asset_units)
    if manage and not allowed:
        raise ApiError(403, "forbidden", "Hanya pengurus Asset dan Property dapat mengelola inventaris dan data peminjam.")
    return actor, allowed


def event_access(session, user_id, event_id, *, write=False, responses=False):
    row = session.get(EventRow, event_id)
    if row is None or row.deleted_at is not None:
        raise ApiError(404, "not_found", "Acara tidak ditemukan.")
    if write:
        lock_period(session, row.period_id)
        if row.program_id:
            lock_program(session, row.program_id)
        row = session.get(EventRow, event_id, with_for_update=True, populate_existing=True)
    actor, policy = require(session, user_id, Action.READ_PROGRESS, period_id=row.period_id)
    staff = session.get(EventStaffRow, (row.id, user_id))
    assigned = bool(row.program_id and policy.allows(actor, Action.EDIT_PROGRAM, program_id=row.program_id))
    # Load the program policy explicitly; organization administration does not expose PII.
    if row.program_id:
        from app.authorization import policy_snapshot
        assigned = policy_snapshot(session, (row.program_id,)).allows(actor, Action.EDIT_PROGRAM, program_id=row.program_id)
    can_edit = policy.current_member(actor, row.period_id) and (row.owner_user_id == user_id or policy.officer(actor, row.period_id) or assigned)
    can_responses = row.owner_user_id == user_id or bool(staff and staff.active)
    if (write and not can_edit) or (responses and not can_responses):
        raise ApiError(403, "forbidden", "Anda tidak memiliki akses pengelolaan acara atau respons ini.")
    return row, actor, can_edit, can_responses


def public_open(session, row):
    period = session.get(PeriodRow, row.period_id)
    program = session.get(ProgramRow, row.program_id) if row.program_id else None
    return bool(row.status == "PUBLISHED" and row.deleted_at is None and period.archived_at is None
                and (program is None or program.closed_at is None))
