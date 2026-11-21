from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.db import Base
from app.organization.models import identifier


class AuditRow(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    actor_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"), index=True)
    actor_name: Mapped[str] = mapped_column(String(160))
    actor_positions: Mapped[list] = mapped_column(JSONB)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    action: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[str] = mapped_column(String(36), index=True)
    period_id: Mapped[str | None] = mapped_column(ForeignKey("erp_ukm.periods.id"), index=True)
    before: Mapped[dict | None] = mapped_column(JSONB)
    after: Mapped[dict | None] = mapped_column(JSONB)


def record_audit(session: Session, *, actor, action: str, resource_id: str,
                 period_id: str | None = None, before: dict | None = None,
                 after: dict | None = None):
    from app.organization.models import MemberRow, UserRow
    user = session.get(UserRow, actor.user_id)
    member = session.get(MemberRow, user.member_id)
    # Callers supply allowlisted DTO fields; never raw request/auth objects.
    session.add(AuditRow(actor_id=actor.user_id, actor_name=member.display_name,
                         actor_positions=[{"period_id": p.period_id, "position": str(p.position)} for p in actor.positions if p.active],
                         action=action, resource_id=resource_id, period_id=period_id,
                         before=before, after=after))
