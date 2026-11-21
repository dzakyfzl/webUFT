from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import Field
from sqlalchemy import func, select

from app.audit import AuditRow, record_audit
from app.authorization import actor_snapshot, policy_snapshot, require
from app.errors import ApiError
from app.http import current_user, transaction
from app.organization.models import BoardMembershipRow, MemberRow, PeriodRow, PositionRow, UserRow
from app.schemas import Input
from app.permissions.policy import Action, Position
from app.programs.models import ProgramRow
from app.work.models import TaskRow


router = APIRouter(prefix="/api/admin/periods", tags=["history"])


class ArchiveInput(Input):
    successor_period_id: str
    confirmed: bool = False


@router.get("/{period_id}/history")
def history(period_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    require(session, user.id, Action.READ_PROGRESS, period_id=period_id)
    period = session.get(PeriodRow, period_id)
    counts = session.execute(select(TaskRow.status, func.count()).where(TaskRow.period_id == period_id,
        TaskRow.deleted_at.is_(None)).group_by(TaskRow.status)).all()
    programs = session.scalar(select(func.count()).select_from(ProgramRow).where(ProgramRow.period_id == period_id))
    archived_event = session.scalar(select(AuditRow).where(AuditRow.resource_id == period_id,
        AuditRow.action == "period.archived").order_by(AuditRow.occurred_at.desc()).limit(1))
    return {"id": period.id, "name": period.name, "archived_at": period.archived_at,
            "archived_by_name": archived_event.actor_name if archived_event else None,
            "tasks": {"TODO": 0, "IN_PROGRESS": 0, "REVIEW": 0, "DONE": 0, **dict(counts)}, "program_count": programs}


@router.post("/{period_id}/archive")
def archive(period_id: str, body: ArchiveInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    # Archive is a rare multi-period action: lock all parents in stable order.
    periods = session.scalars(select(PeriodRow).order_by(PeriodRow.id).with_for_update()).all()
    period = next((p for p in periods if p.id == period_id), None)
    if period is None:
        raise ApiError(404, "not_found", "Periode tidak ditemukan.")
    actor = actor_snapshot(session, user.id, lock=True)
    is_chair = any(p.active and p.period_id == period_id and p.position == Position.CHAIR for p in actor.positions)
    if not actor.active or not is_chair or period_id not in actor.governing_period_ids:
        raise ApiError(403, "forbidden", "Hanya Ketua Umum periode ini dapat mengarsipkan.")
    if period.archived_at is not None:
        return {"id": period.id, "archived_at": period.archived_at}
    require(session, user.id, Action.ARCHIVE_PERIOD, period_id=period_id)
    if not body.confirmed:
        raise ApiError(409, "confirmation_required", "Konfirmasi pengarsipan seluruh progres periode.")
    successor = next((p for p in periods if p.id == body.successor_period_id), None)
    if successor is None or successor.id == period.id or successor.archived_at is not None:
        raise ApiError(422, "invalid_successor", "Siapkan periode penerus yang belum diarsipkan.")
    ready = session.scalar(select(UserRow.id).join(PositionRow, PositionRow.user_id == UserRow.id)
        .join(BoardMembershipRow, BoardMembershipRow.user_id == UserRow.id).where(
            PositionRow.period_id == successor.id, PositionRow.position == Position.CHAIR.value,
            PositionRow.active.is_(True), UserRow.active.is_(True),
            BoardMembershipRow.period_id == successor.id, BoardMembershipRow.active.is_(True)).limit(1))
    if ready is None:
        raise ApiError(409, "successor_not_ready", "Tetapkan akun Ketua Umum aktif pada periode penerus terlebih dahulu.")
    identities = session.execute(select(UserRow.id, MemberRow.display_name).join(MemberRow, MemberRow.id == UserRow.member_id)
        .join(BoardMembershipRow, BoardMembershipRow.user_id == UserRow.id).where(BoardMembershipRow.period_id == period.id)).all()
    period.archived_at, period.archived_by = datetime.now(timezone.utc), user.id
    record_audit(session, actor=actor, action="period.archived", resource_id=period.id, period_id=period.id,
                 before={"archived": False}, after={"archived": True, "successor_period_id": successor.id,
                     "identities": [{"id": identity.id, "display_name": identity.display_name} for identity in identities]})
    return {"id": period.id, "archived_at": period.archived_at}
