from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import and_, exists, func, or_, select

from app.authorization import policy_snapshot, require
from app.errors import ApiError
from app.permissions.policy import Action
from app.organization.models import PeriodRow, UnitRow
from app.programs.models import GrantRow, ProgramRow
from app.programs.service import program_dto
from app.work.models import AgendaRow, TaskRow
from app.work.repository import task_query
from app.work.service import agenda_dto, task_dto


def active_program_ids(session, period_id, user_id):
    return list(session.scalars(select(ProgramRow.id).where(
        ProgramRow.period_id == period_id, ProgramRow.closed_at.is_(None),
        exists(select(GrantRow.id).where(GrantRow.program_id == ProgramRow.id,
            GrantRow.user_id == user_id, GrantRow.active.is_(True))))))


def relevant(model, actor, policy, period_id, program_ids):
    return or_(model.scope_type == "ORGANIZATION",
        model.unit_id.in_(policy.effective_units(actor, period_id)), model.program_id.in_(program_ids))


def calendar(session, user_id, period_id, start, end, mine=False, scope_type=None, scope_id=None):
    if end < start or (end - start).days > 93:
        raise ApiError(422, "date_range", "Pilih rentang kalender maksimal 93 hari.")
    actor, policy = require(session, user_id, Action.READ_PROGRESS, period_id=period_id)
    period = session.get(PeriodRow, period_id)
    if period.archived_at is not None:
        return {"items": []}
    program_ids = active_program_ids(session, period_id, user_id) if mine else []
    agenda_query = select(AgendaRow).outerjoin(ProgramRow, ProgramRow.id == AgendaRow.program_id).where(
        AgendaRow.period_id == period_id, AgendaRow.deleted_at.is_(None),
        or_(AgendaRow.program_id.is_(None), ProgramRow.closed_at.is_(None)),
        AgendaRow.starts_at < datetime.combine(end + timedelta(days=1), time.min, ZoneInfo("Asia/Jakarta")),
        AgendaRow.ends_at >= datetime.combine(start, time.min, ZoneInfo("Asia/Jakarta")))
    tasks_query = task_query(period_id).where(TaskRow.deadline >= start, TaskRow.deadline <= end)
    programs_query = select(ProgramRow).where(ProgramRow.period_id == period_id,
        ProgramRow.closed_at.is_(None), ProgramRow.starts_on.is_not(None), ProgramRow.starts_on <= end,
        or_(ProgramRow.ends_on >= start, and_(ProgramRow.ends_on.is_(None), ProgramRow.starts_on >= start)))
    if mine:
        agenda_query = agenda_query.where(relevant(AgendaRow, actor, policy, period_id, program_ids))
        tasks_query = tasks_query.where(or_(TaskRow.assignee_user_id == user_id,
            relevant(TaskRow, actor, policy, period_id, program_ids)))
        programs_query = programs_query.where(ProgramRow.id.in_(program_ids))
    if scope_type == "PROGRAM":
        agenda_query = agenda_query.where(AgendaRow.program_id == scope_id)
        tasks_query = tasks_query.where(TaskRow.program_id == scope_id)
        programs_query = programs_query.where(ProgramRow.id == scope_id)
    elif scope_type == "ORGANIZATION":
        agenda_query = agenda_query.where(AgendaRow.scope_type == "ORGANIZATION")
        tasks_query = tasks_query.where(TaskRow.scope_type == "ORGANIZATION")
        programs_query = programs_query.where(False)
    elif scope_type:
        unit = session.get(UnitRow, scope_id)
        if unit is None or unit.period_id != period_id:
            raise ApiError(422, "invalid_scope", "Unit tidak berada pada periode ini.")
        unit_ids = [unit.id]
        if unit.kind == "DEPARTMENT":
            unit_ids += list(session.scalars(select(UnitRow.id).where(UnitRow.parent_id == unit.id)))
        agenda_query = agenda_query.where(or_(AgendaRow.unit_id.in_(unit_ids), ProgramRow.owner_unit_id.in_(unit_ids)))
        tasks_query = tasks_query.where(or_(TaskRow.unit_id.in_(unit_ids), ProgramRow.owner_unit_id.in_(unit_ids)))
        programs_query = programs_query.where(ProgramRow.owner_unit_id.in_(unit_ids))
    agendas = session.scalars(agenda_query.limit(1001)).all()
    tasks = session.scalars(tasks_query.limit(1001)).all()
    programs = session.scalars(programs_query.limit(1001)).all()
    if len(agendas) + len(tasks) + len(programs) > 1000:
        raise ApiError(422, "calendar_limit", "Terlalu banyak agenda. Persempit rentang atau filter kalender.")
    ids = {row.program_id for row in agendas + tasks if row.program_id} | {row.id for row in programs}
    policy = policy_snapshot(session, tuple(ids))
    items = [agenda_dto(row, actor, policy) for row in agendas]
    for task in tasks:
        dto = task_dto(task, actor, policy)
        items.append({"id": "task:" + task.id, "resource_id": task.id, "source": "TASK", "title": task.title,
            "starts_on": task.deadline, "ends_on": task.deadline, "scope_type": task.scope_type,
            "scope_id": task.program_id or task.unit_id, "program_id": task.program_id,
            "can_edit": dto["can_edit"]})
    for program in programs:
        dto = program_dto(program, actor, policy)
        items.append({"id": "program:" + program.id, "resource_id": program.id, "source": "PROGRAM",
            "title": program.name, "starts_on": program.starts_on, "ends_on": program.ends_on or program.starts_on,
            "scope_type": "PROGRAM", "scope_id": program.id, "program_id": program.id,
            "can_edit": dto["capabilities"]["edit"]})
    return {"items": items}


def dashboard(session, user_id, period_id):
    actor, _ = require(session, user_id, Action.READ_PROGRESS, period_id=period_id)
    tasks = session.scalars(task_query(period_id).where(TaskRow.assignee_user_id == user_id,
        TaskRow.status != "DONE").order_by(TaskRow.deadline.asc().nulls_last(), TaskRow.id).limit(10)).all()
    ids = active_program_ids(session, period_id, user_id)
    period = session.get(PeriodRow, period_id)
    if period.archived_at is not None:
        ids = []
    programs = session.scalars(select(ProgramRow).where(ProgramRow.id.in_(ids))
        .order_by(ProgramRow.created_at.desc()).limit(10)).all()
    policy = policy_snapshot(session, tuple({t.program_id for t in tasks if t.program_id} | {p.id for p in programs}))
    today = datetime.now(ZoneInfo("Asia/Jakarta")).date()
    events = calendar(session, user_id, period_id, today, today + timedelta(days=30), mine=True)["items"]
    events.sort(key=lambda event: str(event.get("starts_at") or event.get("starts_on") or ""))
    return {"tasks": [task_dto(t, actor, policy) for t in tasks],
            "programs": [program_dto(p, actor, policy) for p in programs], "events": events[:5]}


def monitoring(session, user_id, period_id, archive=False):
    require(session, user_id, Action.CREATE_PROGRAM, period_id=period_id) if not archive else require(
        session, user_id, Action.MANAGE_ORGANIZATION)
    # Group once by the original owner; rollups are computed from disjoint rows.
    owner = func.coalesce(TaskRow.unit_id, ProgramRow.owner_unit_id)
    query = task_query(period_id, archive).with_only_columns(owner.label("owner"), TaskRow.status,
        func.count(TaskRow.id).label("count"), func.count(TaskRow.id).filter(
            TaskRow.deadline < datetime.now(ZoneInfo("Asia/Jakarta")).date(), TaskRow.status != "DONE").label("overdue"))
    rows = session.execute(query.group_by(owner, TaskRow.status)).all()
    units = session.scalars(select(UnitRow).where(UnitRow.period_id == period_id).order_by(UnitRow.name)).all()
    root_id = next((unit.id for unit in units if unit.kind == "ORGANIZATION"), None)
    counts = {u.id: {"TODO": 0, "IN_PROGRESS": 0, "REVIEW": 0, "DONE": 0, "overdue": 0} for u in units}
    for row in rows:
        key = row.owner or root_id
        if key in counts:
            counts[key][row.status] += row.count
            counts[key]["overdue"] += row.overdue
    totals = {status: sum(item[status] for item in counts.values()) for status in ("TODO", "IN_PROGRESS", "REVIEW", "DONE", "overdue")}
    result = []
    for unit in units:
        rollup = dict(counts[unit.id])
        for child in units:
            if child.parent_id == unit.id:
                for status in rollup:
                    rollup[status] += counts[child.id][status]
        result.append({"id": unit.id, "name": unit.name, "kind": unit.kind,
                       "parent_id": unit.parent_id, "direct": counts[unit.id], "rollup": rollup})
    return {"items": result, "total": totals}
