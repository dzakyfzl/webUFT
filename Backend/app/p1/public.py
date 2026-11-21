from datetime import timedelta
import hashlib
import json

from fastapi import APIRouter, Query, Request
from pydantic import Field, ValidationError
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.db import lock_period
from app.errors import ApiError
from app.p1.events import event_dto
from app.p1.forms import validate_answers
from app.p1.models import EventRow, FormRow, FormVersionRow, PublicAttemptRow, SubmissionRow, now
from app.p1.policy import public_open
from app.programs.service import lock_program
from app.schemas import Input


router = APIRouter(prefix="/api/public", tags=["public registration"])


def published_event(session, event_id):
    row = session.get(EventRow, event_id)
    if row is None or row.status != "PUBLISHED" or row.deleted_at:
        raise ApiError(404, "not_found", "Acara tidak ditemukan.")
    return row


def public_dto(row):
    return {key: getattr(row, key) for key in ("id", "title", "description", "starts_at", "ends_at", "location", "poster_url", "related_url")}


@router.get("/events")
def public_events(request: Request, offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100)):
    with request.app.state.database.transaction() as session:
        rows = session.scalars(select(EventRow).where(EventRow.status == "PUBLISHED", EventRow.deleted_at.is_(None))
            .order_by(EventRow.starts_at.desc(), EventRow.id).offset(offset).limit(limit + 1)).all()
        return {"items": [public_dto(row) for row in rows[:limit]], "has_more": len(rows) > limit}


@router.get("/events/{event_id}")
def public_event_detail(event_id: str, request: Request):
    with request.app.state.database.transaction() as session:
        event = published_event(session, event_id)
        form = session.scalar(select(FormRow).where(FormRow.event_id == event_id))
        version = session.get(FormVersionRow, form.published_version_id) if form and form.published_version_id else None
        return {**public_dto(event), "registration": {"form_id": form.id,
            "form_version_id": version.id, "version_number": version.number, "schema": version.schema,
            "accepting": form.accepting and public_open(session, event)} if version else None}


class SubmissionInput(Input):
    form_version_id: str = Field(min_length=1, max_length=36)
    request_id: str = Field(min_length=16, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    answers: dict
    website: str = Field(default="", max_length=200)


def rate_limit(database, request):
    key = hashlib.sha256((request.client.host if request.client else "unknown").encode()).hexdigest()
    with database.transaction() as session:
        session.execute(insert(PublicAttemptRow).values(key_hash=key, attempts=0, window_started_at=now())
            .on_conflict_do_nothing(index_elements=["key_hash"]))
        row = session.get(PublicAttemptRow, key, with_for_update=True, populate_existing=True)
        if now() - row.window_started_at > timedelta(minutes=15):
            row.attempts, row.window_started_at = 0, now()
        blocked = row.attempts >= 20
        row.attempts += 1
    if blocked:
        raise ApiError(429, "submission_rate_limit", "Terlalu banyak pengiriman. Coba lagi nanti.")


@router.post("/events/{event_id}/submissions", status_code=201)
async def submit(event_id: str, request: Request):
    database = request.app.state.database
    rate_limit(database, request)
    payload = bytearray()
    async for chunk in request.stream():
        if len(payload) + len(chunk) > 131072:
            raise ApiError(413, "submission_too_large", "Jawaban terlalu besar.")
        payload.extend(chunk)
    try:
        body = SubmissionInput.model_validate(json.loads(payload))
    except (ValidationError, ValueError, UnicodeDecodeError):
        raise ApiError(422, "invalid_submission", "Periksa isian formulir.") from None
    if body.website:
        raise ApiError(422, "invalid_submission", "Pengiriman tidak valid.")
    with database.transaction() as session:
        event = published_event(session, event_id)
        lock_period(session, event.period_id)
        if event.program_id:
            lock_program(session, event.program_id)
        event = session.get(EventRow, event_id, with_for_update=True, populate_existing=True)
        form = session.scalar(select(FormRow).where(FormRow.event_id == event_id).with_for_update())
        if not form:
            raise ApiError(404, "no_form", "Formulir tidak ditemukan.")
        existing = session.scalar(select(SubmissionRow).where(SubmissionRow.form_id == form.id,
            SubmissionRow.request_id == body.request_id))
        if existing:
            previous = session.get(FormVersionRow, existing.form_version_id)
            if existing.form_version_id != body.form_version_id or existing.answers != validate_answers(previous.schema, body.answers):
                raise ApiError(409, "request_id_conflict", "ID pengiriman sudah digunakan. Gunakan pengiriman baru.")
            return {"accepted": True, "duplicate": True, "receipt_id": existing.id}
        if not form.accepting or not public_open(session, event):
            raise ApiError(409, "registration_closed", "Pendaftaran sudah ditutup.")
        if body.form_version_id != form.published_version_id:
            raise ApiError(409, "stale_form", "Formulir diperbarui. Muat versi terbaru dan periksa kembali isian Anda.")
        version = session.get(FormVersionRow, form.published_version_id)
        answers = validate_answers(version.schema, body.answers)
        row = SubmissionRow(form_id=form.id, form_version_id=version.id, request_id=body.request_id, answers=answers)
        session.add(row)
        session.flush()
        return {"accepted": True, "duplicate": False, "receipt_id": row.id}
