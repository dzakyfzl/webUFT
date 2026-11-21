from dataclasses import asdict
from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert

from app.audit import record_audit
from app.authorization import actor_snapshot, policy_snapshot, require
from app.db import lock_period
from app.errors import ApiError
from app.organization.models import UserRow, identifier
from app.permissions.policy import Action, GrantSource
from app.programs.lifecycle import CommandError, ProgramRecord, close_program, create_program
from app.programs.models import GrantRow, ProgramRow
from app.work.models import TaskRow


def lock_program(session, program_id: str):
    period_id = session.scalar(select(ProgramRow.period_id).where(ProgramRow.id == program_id))
    if period_id is None:
        raise ApiError(404, "not_found", "Proker tidak ditemukan.")
    lock_period(session, period_id)
    row = session.get(ProgramRow, program_id, with_for_update=True, populate_existing=True)
    if row.closed_at is not None:
        raise ApiError(409, "closed", "Proker sudah ditutup dan hanya dapat dibaca.")
    return row


def ensure_version(row, expected_version: int):
    if row.version != expected_version:
        raise ApiError(409, "version_conflict", "Data berubah. Muat ulang sebelum menyimpan.")


def set_grant(session, *, program_id: str, user_id: str, source: GrantSource, source_id: str, active=True):
    session.execute(insert(GrantRow).values(id=identifier(), program_id=program_id,
        user_id=user_id, source=source.value, source_id=source_id, active=active)
        .on_conflict_do_update(index_elements=["program_id", "user_id", "source", "source_id"],
                               set_={"active": active}))


def program_dto(row, actor, policy):
    return {"id": row.id, "period_id": row.period_id, "owner_unit_id": row.owner_unit_id,
            "name": row.name, "description": row.description,
            "chairperson_name": row.chairperson_name, "chairperson_user_id": row.chairperson_user_id,
            "created_by": row.created_by, "created_at": row.created_at,
            "starts_on": row.starts_on, "ends_on": row.ends_on, "closed_at": row.closed_at,
            "status": "CLOSED" if row.closed_at else "ACTIVE", "version": row.version,
            "capabilities": {"edit": policy.allows(actor, Action.EDIT_PROGRAM, program_id=row.id),
                "close": policy.allows(actor, Action.CLOSE_PROGRAM, program_id=row.id),
                "assign": policy.allows(actor, Action.MANAGE_ASSIGNMENTS, program_id=row.id),
                "change_chairperson": policy.allows(actor, Action.CHANGE_CHAIRPERSON, program_id=row.id),
                "structure": policy.allows(actor, Action.MANAGE_COMMITTEE_STRUCTURE, program_id=row.id)}}


def create(session, user_id, body):
    lock_period(session, body.period_id)
    actor, policy = require(session, user_id, Action.CREATE_PROGRAM, period_id=body.period_id)
    chairperson = actor_snapshot(session, body.chairperson_user_id) if body.chairperson_user_id else None
    try:
        change = create_program(policy=policy, actor=actor, program_id=identifier(),
            period_id=body.period_id, owner_unit_id=body.owner_unit_id, name=body.name,
            description=body.description, chairperson_name=body.chairperson_name,
            chairperson=chairperson, starts_on=body.starts_on, ends_on=body.ends_on,
            now=datetime.now(timezone.utc))
    except CommandError as error:
        raise ApiError(422, error.code, str(error)) from None
    record = change.program
    row = ProgramRow(id=record.access.id, period_id=record.access.period_id,
        owner_unit_id=record.access.owner_unit_id, name=record.name, description=record.description,
        chairperson_name=record.chairperson_name, chairperson_user_id=record.access.chairperson_user_id,
        created_by=record.created_by, created_at=record.created_at,
        starts_on=record.starts_on, ends_on=record.ends_on)
    session.add(row)
    session.flush()
    for grant in change.grants:
        set_grant(session, program_id=row.id, user_id=grant.user_id, source=grant.source, source_id=grant.source_id)
    record_audit(session, actor=actor, action="program.created", resource_id=row.id, period_id=row.period_id,
        after={"status": "ACTIVE", "name": row.name, "grants": [list(g) for g in change.audit.grant_sources]})
    return program_dto(row, actor, policy_snapshot(session, (row.id,)))


def edit(session, user_id, program_id, body):
    row = lock_program(session, program_id)
    actor, policy = require(session, user_id, Action.EDIT_PROGRAM, program_id=program_id)
    ensure_version(row, body.expected_version)
    before = {"name": row.name, "description": row.description,
              "starts_on": str(row.starts_on) if row.starts_on else None,
              "ends_on": str(row.ends_on) if row.ends_on else None}
    for field in ("name", "description", "starts_on", "ends_on"):
        setattr(row, field, getattr(body, field))
    if row.starts_on and row.ends_on and row.ends_on < row.starts_on:
        raise ApiError(422, "validation", "Tanggal akhir tidak boleh sebelum tanggal mulai.")
    row.version += 1
    record_audit(session, actor=actor, action="program.updated", resource_id=row.id,
        period_id=row.period_id, before=before, after={"name": row.name, "description": row.description,
            "starts_on": str(row.starts_on) if row.starts_on else None,
            "ends_on": str(row.ends_on) if row.ends_on else None})
    return program_dto(row, actor, policy)


def close(session, user_id, program_id, body):
    # Lock before checking CLOSED, so a retry returns without a second audit.
    period_id = session.scalar(select(ProgramRow.period_id).where(ProgramRow.id == program_id))
    if period_id is None:
        raise ApiError(404, "not_found", "Proker tidak ditemukan.")
    lock_period(session, period_id)
    row = session.get(ProgramRow, program_id, with_for_update=True, populate_existing=True)
    actor = actor_snapshot(session, user_id, lock=True)
    policy = policy_snapshot(session, (program_id,))
    access = policy.program(program_id)
    record = ProgramRecord(access, row.name, row.description, row.chairperson_name,
        row.created_by, row.created_at, row.version, row.starts_on, row.ends_on, row.closed_at)
    remaining = session.scalar(select(func.count()).select_from(TaskRow).where(
        TaskRow.program_id == program_id, TaskRow.deleted_at.is_(None), TaskRow.status != "DONE"))
    try:
        change = close_program(policy=policy, actor=actor, record=record, expected_version=body.expected_version,
            unfinished_tasks=remaining, confirmed_unfinished=body.confirmed_unfinished, now=datetime.now(timezone.utc))
    except CommandError as error:
        statuses = {"forbidden": 403, "validation": 422}
        raise ApiError(statuses.get(error.code, 409), error.code,
                       "Masih ada tugas belum selesai. Konfirmasi untuk menutup." if error.code == "confirmation_required" else str(error)) from None
    if change.audit is not None:
        row.closed_at = change.program.closed_at
        row.version = change.program.version
        session.execute(update(GrantRow).where(GrantRow.program_id == program_id).values(active=False))
        record_audit(session, actor=actor, action="program.closed", resource_id=row.id,
            period_id=row.period_id, before={"status": "ACTIVE"},
            after={"status": "CLOSED", "unfinished_tasks": remaining})
    return program_dto(row, actor, policy_snapshot(session, (program_id,)))


def change_chairperson(session, user_id, program_id, body):
    row = lock_program(session, program_id)
    actor, policy = require(session, user_id, Action.CHANGE_CHAIRPERSON, program_id=program_id)
    ensure_version(row, body.expected_version)
    if body.chairperson_user_id:
        target = actor_snapshot(session, body.chairperson_user_id)
        if not policy.current_member(target, row.period_id):
            raise ApiError(422, "invalid_chairperson", "Ketupel harus pengurus aktif periode ini.")
    before = {"chairperson_user_id": row.chairperson_user_id, "chairperson_name": row.chairperson_name}
    session.execute(update(GrantRow).where(GrantRow.program_id == row.id,
        GrantRow.source == GrantSource.CHAIRPERSON.value).values(active=False))
    row.chairperson_user_id = body.chairperson_user_id
    row.chairperson_name = body.chairperson_name
    row.version += 1
    if row.chairperson_user_id:
        set_grant(session, program_id=row.id, user_id=row.chairperson_user_id,
                  source=GrantSource.CHAIRPERSON, source_id=row.id)
    record_audit(session, actor=actor, action="program.chairperson_changed", resource_id=row.id,
        period_id=row.period_id, before=before,
        after={"chairperson_user_id": row.chairperson_user_id, "chairperson_name": row.chairperson_name})
    return program_dto(row, actor, policy_snapshot(session, (program_id,)))


def manual_assignment(session, user_id, program_id, target_id, active):
    row = lock_program(session, program_id)
    actor, policy = require(session, user_id, Action.MANAGE_ASSIGNMENTS, program_id=program_id)
    target_user = session.get(UserRow, target_id)
    if target_user is None:
        raise ApiError(404, "not_found", "Akun tidak ditemukan.")
    # Revocation must remain possible after the recipient is deactivated.
    if active:
        if not target_user.active or not policy.current_member(actor_snapshot(session, target_id), row.period_id):
            raise ApiError(422, "inactive_member", "Pengelola harus pengurus aktif periode ini.")
    grant = session.scalar(select(GrantRow).where(GrantRow.program_id == row.id,
        GrantRow.user_id == target_id, GrantRow.source == GrantSource.MANUAL.value))
    if grant is not None and grant.active == active:
        return {"id": target_id}
    if grant is None and not active:
        return {"id": target_id}
    set_grant(session, program_id=row.id, user_id=target_id, source=GrantSource.MANUAL, source_id=row.id, active=active)
    record_audit(session, actor=actor, action="assignment.granted" if active else "assignment.revoked",
        resource_id=row.id, period_id=row.period_id, after={"user_id": target_id, "source": "MANUAL", "active": active})
    return {"id": target_id}
