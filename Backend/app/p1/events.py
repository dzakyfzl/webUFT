from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import Field
from sqlalchemy import func, select

from app.audit import record_audit
from app.authorization import actor_snapshot, require
from app.db import lock_period
from app.errors import ApiError
from app.http import current_user, transaction
from app.p1.exports import csv_stream, excel_stream
from app.p1.forms import schema_value, template
from app.p1.models import EventRow, EventStaffRow, FormRow, FormVersionRow, SubmissionRow, now
from app.p1.policy import event_access, program_access, public_open
from app.p1.validation import safe_url
from app.permissions.policy import Action
from app.programs.service import ensure_version
from app.schemas import Input, VersionInput


router = APIRouter(prefix="/api/admin/events", tags=["public events", "form builder"])


class EventInput(Input):
    period_id: str
    program_id: str | None = None
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=15000)
    starts_at: datetime
    ends_at: datetime
    location: str = Field(default="", max_length=200)
    poster_url: str = Field(default="", max_length=2000)
    related_url: str = Field(default="", max_length=2000)
    status: Literal["DRAFT", "PUBLISHED", "UNPUBLISHED"] = "DRAFT"
    expected_version: int = Field(default=1, ge=1)


def event_dto(row, edit=False, responses=False):
    data = {key: getattr(row, key) for key in ("id", "period_id", "program_id", "owner_user_id", "title", "description",
        "starts_at", "ends_at", "location", "poster_url", "related_url", "status", "version")}
    data["capabilities"] = {"edit": edit, "responses": responses}
    return data


@router.get("")
def list_events(period_id: str, offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100),
                user=Depends(current_user), session=Depends(transaction, scope="function")):
    require(session, user.id, Action.READ_PROGRESS, period_id=period_id)
    rows = session.scalars(select(EventRow).where(EventRow.period_id == period_id, EventRow.deleted_at.is_(None))
        .order_by(EventRow.starts_at.desc(), EventRow.id).offset(offset).limit(limit + 1)).all()
    return {"items": [event_dto(row) for row in rows[:limit]], "has_more": len(rows) > limit}


@router.post("", status_code=201)
def create_event(body: EventInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    lock_period(session, body.period_id)
    actor, _ = require(session, user.id, Action.READ_PROGRESS, period_id=body.period_id)
    if body.program_id:
        program, _, _ = program_access(session, user.id, body.program_id, write=True)
        if program.period_id != body.period_id:
            raise ApiError(422, "scope_period", "Proker harus berada pada periode acara.")
    validate_event(body)
    row = EventRow(**body.model_dump(exclude={"expected_version"}), owner_user_id=user.id)
    session.add(row)
    session.flush()
    record_audit(session, actor=actor, action="event.created", resource_id=row.id, period_id=row.period_id,
                 after={"title": row.title, "status": row.status})
    return event_dto(row, True, True)


def validate_event(body):
    if body.starts_at.tzinfo is None or body.ends_at.tzinfo is None or body.ends_at < body.starts_at:
        raise ApiError(422, "event_dates", "Gunakan waktu dengan zona dan tanggal akhir sesudah tanggal mulai.")
    safe_url(body.poster_url, optional=True)
    safe_url(body.related_url, optional=True)


@router.get("/{event_id}")
def event_detail(event_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    row, _, edit, responses = event_access(session, user.id, event_id)
    from app.organization.models import PeriodRow
    from app.programs.models import ProgramRow
    frozen = session.get(PeriodRow, row.period_id).archived_at is not None or bool(
        row.program_id and session.get(ProgramRow, row.program_id).closed_at)
    staff = session.scalars(select(EventStaffRow).where(EventStaffRow.event_id == event_id, EventStaffRow.active.is_(True))).all() if responses else []
    form = session.scalar(select(FormRow).where(FormRow.event_id == event_id))
    version = session.get(FormVersionRow, form.published_version_id) if form and form.published_version_id else None
    return {**event_dto(row, edit and not frozen, responses),
            "has_form": form is not None, "published_form_version": version.number if version else None,
            "registration_open": bool(version and form.accepting and public_open(session, row)), "frozen": frozen,
            "staff_ids": [item.user_id for item in staff], "can_staff": row.owner_user_id == user.id and not frozen}


@router.patch("/{event_id}")
def update_event(event_id: str, body: EventInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    row, actor, _, responses = event_access(session, user.id, event_id, write=True)
    row = session.get(EventRow, event_id, with_for_update=True, populate_existing=True)
    ensure_version(row, body.expected_version)
    if body.period_id != row.period_id or body.program_id != row.program_id:
        raise ApiError(422, "immutable_scope", "Periode dan Proker acara tidak dapat dipindah.")
    validate_event(body)
    before = {"title": row.title, "status": row.status}
    for key, value in body.model_dump(exclude={"expected_version", "period_id", "program_id"}).items():
        setattr(row, key, value)
    row.version += 1
    record_audit(session, actor=actor, action="event.updated", resource_id=row.id, period_id=row.period_id,
                 before=before, after={"title": row.title, "status": row.status})
    return event_dto(row, True, responses)


@router.delete("/{event_id}")
def delete_event(event_id: str, body: VersionInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    row, actor, _, _ = event_access(session, user.id, event_id, write=True)
    ensure_version(row, body.expected_version)
    row.deleted_at, row.version = now(), row.version + 1
    record_audit(session, actor=actor, action="event.deleted", resource_id=row.id, period_id=row.period_id)
    return {"id": row.id}


class StaffInput(Input):
    user_ids: list[str] = Field(max_length=100)


@router.put("/{event_id}/staff")
def set_staff(event_id: str, body: StaffInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    row, actor, _, _ = event_access(session, user.id, event_id, write=True)
    if row.owner_user_id != user.id:
        raise ApiError(403, "forbidden", "Hanya pembuat acara menunjuk petugas respons.")
    from app.authorization import policy_snapshot
    policy = policy_snapshot(session)
    for user_id in set(body.user_ids):
        if not policy.current_member(actor_snapshot(session, user_id), row.period_id):
            raise ApiError(422, "inactive_staff", "Petugas harus pengurus aktif pada periode acara.")
    existing = {staff.user_id: staff for staff in session.scalars(select(EventStaffRow).where(EventStaffRow.event_id == event_id))}
    for key, staff in existing.items():
        staff.active = key in body.user_ids
    for user_id in set(body.user_ids) - existing.keys():
        session.add(EventStaffRow(event_id=event_id, user_id=user_id))
    record_audit(session, actor=actor, action="event.staff.updated", resource_id=event_id, period_id=row.period_id,
                 after={"user_ids": sorted(set(body.user_ids))})
    return {"user_ids": body.user_ids}


def get_form(session, event_id, *, lock=False):
    row = session.scalar(select(FormRow).where(FormRow.event_id == event_id).with_for_update() if lock else select(FormRow).where(FormRow.event_id == event_id))
    if row is None:
        raise ApiError(404, "no_form", "Acara belum memiliki formulir.")
    return row


def form_dto(session, row):
    versions = session.scalars(select(FormVersionRow).where(FormVersionRow.form_id == row.id).order_by(FormVersionRow.number.desc())).all()
    return {"id": row.id, "draft_schema": row.draft_schema, "accepting": row.accepting,
        "published_version_id": row.published_version_id, "version": row.version,
        "versions": [{"id": v.id, "number": v.number, "schema": v.schema} for v in versions]}


@router.get("/{event_id}/form")
def form_detail(event_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    _, _, edit, responses = event_access(session, user.id, event_id)
    if not edit and not responses:
        raise ApiError(403, "forbidden", "Akses editor atau petugas respons diperlukan.")
    return form_dto(session, get_form(session, event_id))


class CreateFormInput(Input):
    use_template: bool = True


@router.post("/{event_id}/form", status_code=201)
def create_form(event_id: str, body: CreateFormInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    event, actor, _, _ = event_access(session, user.id, event_id, write=True)
    value = template(event.title) if body.use_template else {"title": event.title, "description": "", "sections": []}
    row = FormRow(event_id=event_id, draft_schema=schema_value(value))
    session.add(row)
    session.flush()
    record_audit(session, actor=actor, action="form.created", resource_id=row.id, period_id=event.period_id)
    return form_dto(session, row)


class FormInput(VersionInput):
    form_schema: dict = Field(alias="schema")


@router.put("/{event_id}/form")
def save_form(event_id: str, body: FormInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    event, actor, _, _ = event_access(session, user.id, event_id, write=True)
    row = get_form(session, event_id, lock=True)
    ensure_version(row, body.expected_version)
    row.draft_schema, row.version = schema_value(body.form_schema), row.version + 1
    record_audit(session, actor=actor, action="form.draft.saved", resource_id=row.id, period_id=event.period_id,
                 after={"version": row.version})
    return form_dto(session, row)


@router.post("/{event_id}/form/publish")
def publish_form(event_id: str, body: VersionInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    event, actor, _, _ = event_access(session, user.id, event_id, write=True)
    row = get_form(session, event_id, lock=True)
    ensure_version(row, body.expected_version)
    number = session.scalar(select(func.coalesce(func.max(FormVersionRow.number), 0)).where(FormVersionRow.form_id == row.id)) + 1
    version = FormVersionRow(form_id=row.id, number=number, schema=schema_value(row.draft_schema))
    session.add(version)
    session.flush()
    row.published_version_id, row.version = version.id, row.version + 1
    record_audit(session, actor=actor, action="form.published", resource_id=row.id, period_id=event.period_id,
                 after={"form_version_id": version.id, "number": number})
    return form_dto(session, row)


class AcceptanceInput(VersionInput):
    accepting: bool


@router.post("/{event_id}/form/acceptance")
def set_acceptance(event_id: str, body: AcceptanceInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    event, actor, _, _ = event_access(session, user.id, event_id, write=True)
    row = get_form(session, event_id, lock=True)
    ensure_version(row, body.expected_version)
    if body.accepting and (not row.published_version_id or not public_open(session, event)):
        raise ApiError(409, "not_published", "Terbitkan acara dan versi form sebelum membuka pendaftaran.")
    row.accepting, row.version = body.accepting, row.version + 1
    record_audit(session, actor=actor, action="form.acceptance.updated", resource_id=row.id, period_id=event.period_id,
                 after={"accepting": row.accepting})
    return form_dto(session, row)


@router.get("/{event_id}/responses")
def responses(event_id: str, form_version_id: str | None = None, search: str = Query("", max_length=160),
              offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100),
              user=Depends(current_user), session=Depends(transaction, scope="function")):
    event_access(session, user.id, event_id, responses=True)
    form = get_form(session, event_id)
    query = select(SubmissionRow).where(SubmissionRow.form_id == form.id, SubmissionRow.deleted_at.is_(None))
    if form_version_id:
        query = query.where(SubmissionRow.form_version_id == form_version_id)
    if search.strip():
        from sqlalchemy import Text, cast
        query = query.where(cast(SubmissionRow.answers, Text).icontains(search.strip(), autoescape=True))
    total = session.scalar(select(func.count()).select_from(query.subquery()))
    rows = session.scalars(query.order_by(SubmissionRow.submitted_at.desc(), SubmissionRow.id).offset(offset).limit(limit + 1)).all()
    return {"items": [{"id": r.id, "form_version_id": r.form_version_id, "answers": r.answers,
                       "submitted_at": r.submitted_at} for r in rows[:limit]], "has_more": len(rows) > limit, "total": total}


@router.delete("/{event_id}/responses/{submission_id}")
def delete_response(event_id: str, submission_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    event, actor, _, _ = event_access(session, user.id, event_id, write=True, responses=True)
    form = get_form(session, event_id)
    row = session.get(SubmissionRow, submission_id, with_for_update=True)
    if row is None or row.form_id != form.id:
        raise ApiError(404, "not_found", "Respons tidak ditemukan.")
    row.deleted_at = now()
    record_audit(session, actor=actor, action="submission.deleted", resource_id=row.id, period_id=event.period_id)
    return {"id": row.id}


@router.get("/{event_id}/responses-export")
def export_responses(event_id: str, form_version_id: str, request: Request, format: Literal["csv", "xlsx"] = "csv",
                     user=Depends(current_user), session=Depends(transaction, scope="function")):
    event, actor, _, _ = event_access(session, user.id, event_id, responses=True)
    form = get_form(session, event_id)
    version = session.get(FormVersionRow, form_version_id)
    if version is None or version.form_id != form.id:
        raise ApiError(422, "form_version", "Pilih versi formulir milik acara ini.")
    query = select(SubmissionRow).where(SubmissionRow.form_id == form.id,
        SubmissionRow.form_version_id == version.id, SubmissionRow.deleted_at.is_(None))
    count = session.scalar(select(func.count()).select_from(query.subquery()))
    if count > 10000:
        raise ApiError(422, "export_limit", "Ekspor dibatasi 10.000 respons per versi.")
    payload_size = session.scalar(select(func.coalesce(func.sum(func.pg_column_size(SubmissionRow.answers)), 0)).where(
        SubmissionRow.form_id == form.id, SubmissionRow.form_version_id == version.id, SubmissionRow.deleted_at.is_(None)))
    if payload_size > 20 * 1024 * 1024:
        raise ApiError(422, "export_limit", "Ekspor versi ini melebihi batas 20 MB jawaban.")
    questions = [q for section in version.schema["sections"] for q in section["questions"]]
    record_audit(session, actor=actor, action="submission.exported", resource_id=form.id, period_id=event.period_id,
                 after={"form_version_id": version.id, "count": count, "format": format})
    def rows():
        yield ["Response ID", "Submitted at", "Form version"] + [q["label"] for q in questions]
        with request.app.state.database.transaction() as reader:
            for row in reader.scalars(query.order_by(SubmissionRow.submitted_at, SubmissionRow.id).execution_options(yield_per=100)):
                yield [row.id, row.submitted_at.isoformat(), version.number] + [
                    "; ".join(row.answers.get(q["id"], [])) if isinstance(row.answers.get(q["id"]), list)
                    else row.answers.get(q["id"], "") for q in questions]
    media = "text/csv; charset=utf-8" if format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return StreamingResponse(csv_stream(rows()) if format == "csv" else excel_stream(rows()), media_type=media,
        headers={"Content-Disposition": f'attachment; filename="responses-v{version.number}.{format}"', "Cache-Control": "no-store"})
