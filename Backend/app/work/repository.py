from sqlalchemy import and_, or_, select

from app.organization.models import PeriodRow
from app.programs.models import ProgramRow
from app.work.models import TaskRow


def task_query(period_id, archive=False):
    query = select(TaskRow).join(PeriodRow).outerjoin(ProgramRow, ProgramRow.id == TaskRow.program_id).where(
        TaskRow.period_id == period_id, TaskRow.deleted_at.is_(None))
    archived = or_(PeriodRow.archived_at.is_not(None), ProgramRow.closed_at.is_not(None))
    return query.where(archived if archive else and_(PeriodRow.archived_at.is_(None),
        or_(TaskRow.program_id.is_(None), ProgramRow.closed_at.is_(None))))
