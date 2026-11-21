from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import Field
from sqlalchemy import select

from app.audit import record_audit
from app.authorization import require
from app.db import lock_period
from app.errors import ApiError
from app.http import current_user, transaction
from app.p1.models import ShortLinkRow, now
from app.p1.validation import safe_url
from app.permissions.policy import Action
from app.programs.service import ensure_version
from app.schemas import Input, VersionInput


router = APIRouter(tags=["short links"])


class LinkInput(Input):
    period_id: str
    slug: str = Field(min_length=3, max_length=80, pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_-]+$")
    destination_url: str = Field(min_length=1, max_length=2000)
    active: bool = True
    expected_version: int = Field(default=1, ge=1)


def dto(row, can_edit):
    return {key: getattr(row, key) for key in ("id", "period_id", "owner_user_id", "slug", "destination_url", "active", "version")} | {"can_edit": can_edit}


@router.get("/api/admin/links")
def list_links(period_id: str, offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100),
               user=Depends(current_user), session=Depends(transaction, scope="function")):
    actor, policy = require(session, user.id, Action.READ_PROGRESS, period_id=period_id)
    rows = session.scalars(select(ShortLinkRow).where(ShortLinkRow.period_id == period_id, ShortLinkRow.deleted_at.is_(None))
        .order_by(ShortLinkRow.slug).offset(offset).limit(limit + 1)).all()
    return {"items": [dto(row, policy.current_member(actor, period_id) and
        (row.owner_user_id == user.id or policy.officer(actor, period_id))) for row in rows[:limit]], "has_more": len(rows) > limit}


def save(session, user, body, link_id=None):
    lock_period(session, body.period_id)
    actor, policy = require(session, user.id, Action.READ_PROGRESS, period_id=body.period_id)
    row = session.get(ShortLinkRow, link_id, with_for_update=True, populate_existing=True) if link_id else ShortLinkRow(
        period_id=body.period_id, owner_user_id=user.id)
    if row is None or row.deleted_at:
        raise ApiError(404, "not_found", "Tautan tidak ditemukan.")
    if link_id:
        if row.period_id != body.period_id or not (row.owner_user_id == user.id or policy.officer(actor, body.period_id)):
            raise ApiError(403, "forbidden", "Hanya pembuat atau Inti dapat mengubah tautan.")
        ensure_version(row, body.expected_version)
    slug = body.slug.lower()
    if slug in {"api", "admin", "login", "events", "link", "shortlink", "health", "ready"}:
        raise ApiError(422, "reserved_slug", "Slug tersebut digunakan aplikasi.")
    safe_url(body.destination_url, resolve=True)
    before = {"slug": row.slug, "active": row.active} if link_id else None
    row.slug, row.destination_url, row.active = slug, body.destination_url, body.active
    row.version = row.version + 1 if link_id else 1
    session.add(row)
    session.flush()
    record_audit(session, actor=actor, action="shortlink.saved", resource_id=row.id, period_id=row.period_id,
                 before=before, after={"slug": row.slug, "active": row.active, "destination_url": row.destination_url})
    return dto(row, True)


@router.post("/api/admin/links", status_code=201)
def create_link(body: LinkInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return save(session, user, body)


@router.patch("/api/admin/links/{link_id}")
def update_link(link_id: str, body: LinkInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return save(session, user, body, link_id)


@router.delete("/api/admin/links/{link_id}")
def delete_link(link_id: str, body: VersionInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    row = session.get(ShortLinkRow, link_id)
    if row is None or row.deleted_at:
        raise ApiError(404, "not_found", "Tautan tidak ditemukan.")
    lock_period(session, row.period_id)
    actor, policy = require(session, user.id, Action.READ_PROGRESS, period_id=row.period_id)
    row = session.get(ShortLinkRow, link_id, with_for_update=True, populate_existing=True)
    if row.owner_user_id != user.id and not policy.officer(actor, row.period_id):
        raise ApiError(403, "forbidden", "Hanya pembuat atau Inti dapat menghapus tautan.")
    ensure_version(row, body.expected_version)
    row.deleted_at, row.active, row.version = now(), False, row.version + 1
    record_audit(session, actor=actor, action="shortlink.deleted", resource_id=row.id, period_id=row.period_id)
    return {"id": row.id}


def destination(request, slug):
    with request.app.state.database.transaction() as session:
        row = session.scalar(select(ShortLinkRow).where(ShortLinkRow.slug == slug.lower(),
            ShortLinkRow.active.is_(True), ShortLinkRow.deleted_at.is_(None)))
        if row is None:
            raise ApiError(404, "not_found", "Tautan tidak ditemukan atau tidak aktif.")
        return safe_url(row.destination_url, resolve=True)


@router.get("/api/shortlink/r/{slug}")
def resolve_legacy(slug: str, request: Request):
    return {"destinationUrl": destination(request, slug)}


@router.get("/api/public/links/{slug}")
def redirect_link(slug: str, request: Request):
    return RedirectResponse(destination(request, slug), status_code=307, headers={"Cache-Control": "no-store"})
