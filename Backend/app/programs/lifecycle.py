"""Lifecycle decisions, independent of HTTP and persistence.

The application adapter must lock period -> program, load a fresh Policy and
persist each returned Change (including grants and audit) in ONE transaction.
This module does not implement that adapter or claim database atomicity.
"""

from dataclasses import dataclass, replace
from datetime import date, datetime

from app.permissions.policy import Action, Actor, Grant, GrantSource, Policy, Program


class CommandError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class ProgramRecord:
    access: Program
    name: str
    description: str
    chairperson_name: str
    created_by: str
    created_at: datetime
    version: int = 1
    starts_on: date | None = None
    ends_on: date | None = None
    closed_at: datetime | None = None


@dataclass(frozen=True)
class AuditEvent:
    actor_id: str
    occurred_at: datetime
    action: str
    program_id: str
    # Only fixed, non-secret lifecycle fields belong in this event.
    before_status: str | None
    after_status: str
    grant_sources: tuple[tuple[str, str, str], ...] = ()
    unfinished_tasks: int | None = None


@dataclass(frozen=True)
class Change:
    program: ProgramRecord
    grants: tuple[Grant, ...]
    audit: AuditEvent | None

    @property
    def effective_assignees(self) -> frozenset[str]:
        return frozenset(grant.user_id for grant in self.grants if grant.active)


def _timestamp(value: datetime) -> None:
    if value.tzinfo is None or value.utcoffset() is None:
        raise CommandError("validation", "Timezone-aware timestamp required")


def create_program(*, policy: Policy, actor: Actor, program_id: str,
                   period_id: str, owner_unit_id: str, name: str,
                   description: str, chairperson_name: str, now: datetime,
                   chairperson: Actor | None = None, starts_on: date | None = None,
                   ends_on: date | None = None) -> Change:
    """Owner must first be resolved under the pending D07 application policy."""
    if not policy.allows(actor, Action.CREATE_PROGRAM, period_id=period_id):
        raise CommandError("forbidden", "Not allowed to create a program")
    period = policy.period(period_id)
    if period is None or period.archived:
        raise CommandError("immutable", "Period is archived")
    owner = policy.unit(owner_unit_id)
    if owner is None or owner.period_id != period_id:
        raise CommandError("validation", "Owner must belong to the program period")
    if not program_id or policy.program(program_id) is not None:
        raise CommandError("conflict", "Program ID already exists or is empty")
    if not name.strip() or not chairperson_name.strip():
        raise CommandError("validation", "Program and chairperson names are required")
    if starts_on is not None and ends_on is not None and ends_on < starts_on:
        raise CommandError("validation", "End date precedes start date")
    if chairperson is not None and not policy.current_member(chairperson, period_id):
        raise CommandError("validation", "Chairperson account must be an active board member")
    _timestamp(now)
    program = Program(program_id, period_id, owner_unit_id,
                      chairperson.user_id if chairperson else None)
    record = ProgramRecord(program, name.strip(), description.strip(),
                           chairperson_name.strip(), actor.user_id, now,
                           starts_on=starts_on, ends_on=ends_on)
    grants = [Grant(program_id, actor.user_id, GrantSource.CREATOR, program_id)]
    if chairperson is not None:
        grants.append(Grant(program_id, chairperson.user_id, GrantSource.CHAIRPERSON, program_id))
    # Two provenance sources for the same person still yield ONE effective user.
    sources = tuple((g.user_id, g.source.value, g.source_id) for g in grants)
    return Change(record, tuple(grants), AuditEvent(
        actor.user_id, now, "program.created", program_id, None, "ACTIVE", sources,
    ))


def close_program(*, policy: Policy, actor: Actor, record: ProgramRecord,
                  expected_version: int, unfinished_tasks: int,
                  confirmed_unfinished: bool, now: datetime) -> Change:
    """Count unfinished tasks under the same DB lock used for this command.

    Closure does not return task updates: TODO/IN_PROGRESS remain historical.
    Repeating an already successful close is a no-op, without duplicate audit.
    """
    _timestamp(now)
    current = policy.program(record.access.id)
    if current is None or current != record.access:
        raise CommandError("conflict", "Program snapshot is stale")
    if not policy.readable(actor):
        raise CommandError("forbidden", "Active board account required")
    period = policy.period(current.period_id)
    if period is None or period.archived:
        raise CommandError("immutable", "Period is archived")
    authorized = policy.officer(actor, current.period_id) or (
        policy.current_member(actor, current.period_id)
        and actor.user_id == current.chairperson_user_id
        and (current.closed or policy.assigned(actor, current))
    )
    if not authorized:
        raise CommandError("forbidden", "Only the chairperson or Inti may close")
    if current.closed:
        return Change(record, (), None)
    if record.version != expected_version:
        raise CommandError("conflict", "Program changed; reload before confirming")
    if type(unfinished_tasks) is not int or unfinished_tasks < 0:
        raise CommandError("validation", "Invalid unfinished task count")
    if unfinished_tasks and confirmed_unfinished is not True:
        raise CommandError("confirmation_required", "Confirm the unfinished task warning")
    closed = replace(record, access=replace(current, closed=True), closed_at=now,
                     version=record.version + 1)
    grants = tuple(replace(g, active=False) for g in policy.grants
                   if g.program_id == current.id and g.active)
    return Change(closed, grants, AuditEvent(
        actor.user_id, now, "program.closed", current.id, "ACTIVE", "CLOSED",
        unfinished_tasks=unfinished_tasks,
    ))
