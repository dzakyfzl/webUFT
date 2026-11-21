from datetime import date, datetime

from fastapi import APIRouter, Depends
from pydantic import Field

from app.http import current_user, transaction
from app.schemas import Input, VersionInput
from app.permissions.policy import ScopeType
from app.work import overview, service
from app.work.schemas import ScopeInput


router = APIRouter(prefix="/api/admin", tags=["calendar", "dashboard", "monitoring"])


class AgendaFields(Input):
    title: str = Field(min_length=1, max_length=160)
    starts_at: datetime
    ends_at: datetime


class AgendaInput(AgendaFields, ScopeInput):
    pass


class AgendaUpdate(AgendaFields, VersionInput):
    pass


@router.get("/calendar-events")
def calendar_events(period_id: str, start: date, end: date, mine: bool = False,
                    scope_type: ScopeType | None = None, scope_id: str | None = None,
                    user=Depends(current_user), session=Depends(transaction, scope="function")):
    return overview.calendar(session, user.id, period_id, start, end, mine, scope_type, scope_id)


@router.post("/calendar-events", status_code=201)
def create_agenda(body: AgendaInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.agenda_save(session, user.id, body)


@router.patch("/calendar-events/{agenda_id}")
def update_agenda(agenda_id: str, body: AgendaUpdate, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.agenda_save(session, user.id, body, agenda_id)


@router.delete("/calendar-events/{agenda_id}")
def remove_agenda(agenda_id: str, body: VersionInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return service.agenda_save(session, user.id, body, agenda_id, True)


@router.get("/dashboard")
def dashboard(period_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return overview.dashboard(session, user.id, period_id)


@router.get("/monitoring/units")
def monitoring(period_id: str, archive: bool = False, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return overview.monitoring(session, user.id, period_id, archive)
