"""PRD v1.6 authorization rules.

Inputs must be loaded from authoritative storage inside the mutation transaction.
These checks do not replace row locks, foreign keys, authentication, or audit.
Unresolved product decisions deliberately have no mutation permission here.
"""

from dataclasses import dataclass
from enum import StrEnum


class Position(StrEnum):
    CHAIR = "CHAIR"
    VICE_CHAIR = "VICE_CHAIR"
    SECRETARY = "SECRETARY"
    TREASURER = "TREASURER"
    HEAD_INTERNAL = "HEAD_INTERNAL"
    HEAD_EXTERNAL = "HEAD_EXTERNAL"
    HEAD_ASSET = "HEAD_ASSET"
    HEAD_HUNTING = "HEAD_HUNTING"
    HEAD_MODELING = "HEAD_MODELING"
    HEAD_MEDKOM = "HEAD_MEDKOM"
    HEAD_PR = "HEAD_PR"
    HEAD_HR = "HEAD_HR"


class UnitType(StrEnum):
    ORGANIZATION = "ORGANIZATION"
    DEPARTMENT = "DEPARTMENT"
    DIVISION = "DIVISION"
    FUNCTION = "FUNCTION"


class ScopeType(StrEnum):
    ORGANIZATION = "ORGANIZATION"
    DEPARTMENT = "DEPARTMENT"
    DIVISION = "DIVISION"
    PROGRAM = "PROGRAM"


class Action(StrEnum):
    READ_PROGRESS = "READ_PROGRESS"
    MANAGE_ORGANIZATION = "MANAGE_ORGANIZATION"
    CREATE_PROGRAM = "CREATE_PROGRAM"
    EDIT_PROGRAM = "EDIT_PROGRAM"
    CLOSE_PROGRAM = "CLOSE_PROGRAM"
    CHANGE_CHAIRPERSON = "CHANGE_CHAIRPERSON"
    MANAGE_ASSIGNMENTS = "MANAGE_ASSIGNMENTS"
    MANAGE_COMMITTEE_STRUCTURE = "MANAGE_COMMITTEE_STRUCTURE"
    EDIT_SCOPED_RECORD = "EDIT_SCOPED_RECORD"
    ARCHIVE_PERIOD = "ARCHIVE_PERIOD"


@dataclass(frozen=True)
class Period:
    id: str
    archived: bool = False


@dataclass(frozen=True)
class Unit:
    id: str
    period_id: str
    kind: UnitType
    parent_id: str | None = None
    name: str = ""


@dataclass(frozen=True)
class Membership:
    unit_id: str
    active: bool = True


@dataclass(frozen=True)
class PositionAssignment:
    period_id: str
    position: Position
    active: bool = True


@dataclass(frozen=True)
class Actor:
    user_id: str
    active: bool
    # Active board membership, including officers without an explicit unit.
    governing_period_ids: frozenset[str]
    memberships: tuple[Membership, ...] = ()
    positions: tuple[PositionAssignment, ...] = ()


@dataclass(frozen=True)
class Program:
    id: str
    period_id: str
    owner_unit_id: str
    chairperson_user_id: str | None = None
    closed: bool = False
    name: str = ""


class GrantSource(StrEnum):
    CREATOR = "CREATOR"
    CHAIRPERSON = "CHAIRPERSON"
    MANUAL = "MANUAL"
    TASK_PIC = "TASK_PIC"


@dataclass(frozen=True)
class Grant:
    program_id: str
    user_id: str
    source: GrantSource
    source_id: str
    active: bool = True


@dataclass(frozen=True)
class Scope:
    kind: ScopeType
    period_id: str
    resource_id: str | None = None


@dataclass(frozen=True)
class Policy:
    periods: tuple[Period, ...]
    units: tuple[Unit, ...]
    programs: tuple[Program, ...] = ()
    grants: tuple[Grant, ...] = ()

    def __post_init__(self) -> None:
        for rows in (self.periods, self.units, self.programs):
            if len({row.id for row in rows}) != len(rows):
                raise ValueError("Duplicate resource ID")
        for unit in self.units:
            if self.period(unit.period_id) is None:
                raise ValueError("Unit period does not exist")
            if unit.parent_id is not None:
                parent = self.unit(unit.parent_id)
                if (unit.kind != UnitType.DIVISION or parent is None
                        or parent.kind != UnitType.DEPARTMENT
                        or parent.period_id != unit.period_id):
                    raise ValueError("Division must belong to a department in its period")
        for program in self.programs:
            owner = self.unit(program.owner_unit_id)
            if owner is None or owner.period_id != program.period_id:
                raise ValueError("Program owner must belong to its period")
        for grant in self.grants:
            if self.program(grant.program_id) is None:
                raise ValueError("Grant program does not exist")
            if not isinstance(grant.source, GrantSource) or not grant.source_id:
                raise ValueError("Grant requires a known source and source ID")

    def period(self, resource_id: str) -> Period | None:
        return next((p for p in self.periods if p.id == resource_id), None)

    def unit(self, resource_id: str) -> Unit | None:
        return next((u for u in self.units if u.id == resource_id), None)

    def program(self, resource_id: str) -> Program | None:
        return next((p for p in self.programs if p.id == resource_id), None)

    def current_member(self, actor: Actor, period_id: str) -> bool:
        period = self.period(period_id)
        return bool(actor.active and period and not period.archived
                    and period_id in actor.governing_period_ids)

    def officer(self, actor: Actor, period_id: str) -> bool:
        return self.current_member(actor, period_id) and any(
            p.active and p.period_id == period_id and isinstance(p.position, Position)
            for p in actor.positions
        )

    def effective_units(self, actor: Actor, period_id: str) -> frozenset[str]:
        if not self.current_member(actor, period_id):
            return frozenset()
        ids: set[str] = set()
        for membership in actor.memberships:
            unit = self.unit(membership.unit_id)
            if not membership.active or unit is None or unit.period_id != period_id:
                continue
            ids.add(unit.id)
            if unit.parent_id is not None:
                ids.add(unit.parent_id)
        return frozenset(ids)

    def assigned(self, actor: Actor, program: Program) -> bool:
        return any(g.active and g.program_id == program.id
                   and g.user_id == actor.user_id for g in self.grants)

    def readable(self, actor: Actor) -> bool:
        # Current officers can read prior periods without holding an old role.
        return any(self.current_member(actor, p.id) for p in self.periods)

    def allows(self, actor: Actor, action: Action, *, period_id: str | None = None,
               program_id: str | None = None, scope: Scope | None = None) -> bool:
        if not self.readable(actor):
            return False
        if action == Action.MANAGE_ORGANIZATION:
            # An archived historical role must neither grant nor block global admin.
            return any(self.officer(actor, p.id) for p in self.periods)
        if action == Action.READ_PROGRESS:
            if program_id is not None:
                return self.program(program_id) is not None
            return period_id is not None and self.period(period_id) is not None
        if action == Action.EDIT_SCOPED_RECORD:
            return scope is not None and self._edit_scope(actor, scope)
        if action in (Action.CREATE_PROGRAM, Action.ARCHIVE_PERIOD):
            if period_id is None or not self.officer(actor, period_id):
                return False
            if action == Action.CREATE_PROGRAM:
                return True
            return any(p.active and p.period_id == period_id
                       and p.position == Position.CHAIR for p in actor.positions)
        program = self.program(program_id) if program_id is not None else None
        if (program is None or program.closed
                or not self.current_member(actor, program.period_id)):
            return False
        if action == Action.EDIT_PROGRAM:
            return self.assigned(actor, program)
        if action == Action.CLOSE_PROGRAM:
            return (self.officer(actor, program.period_id)
                    or (actor.user_id == program.chairperson_user_id
                        and self.assigned(actor, program)))
        if action == Action.CHANGE_CHAIRPERSON:
            return self.officer(actor, program.period_id)
        if action == Action.MANAGE_COMMITTEE_STRUCTURE:
            return (actor.user_id == program.chairperson_user_id
                    and self.assigned(actor, program))
        if action == Action.MANAGE_ASSIGNMENTS:
            owner = self.unit(program.owner_unit_id)
            if owner is None:
                return False
            if owner.kind in (UnitType.FUNCTION, UnitType.ORGANIZATION):
                return self.officer(actor, program.period_id)
            department_id = owner.parent_id if owner.kind == UnitType.DIVISION else owner.id
            department = self.unit(department_id) if department_id is not None else None
            return bool(department and department.kind == UnitType.DEPARTMENT
                        and department.id in self.effective_units(actor, program.period_id))
        return False

    def _edit_scope(self, actor: Actor, scope: Scope) -> bool:
        if not self.current_member(actor, scope.period_id):
            return False
        if scope.kind == ScopeType.ORGANIZATION:
            return scope.resource_id is None
        if scope.kind == ScopeType.PROGRAM:
            program = self.program(scope.resource_id) if scope.resource_id else None
            return bool(program and program.period_id == scope.period_id
                        and self.allows(actor, Action.EDIT_PROGRAM, program_id=program.id))
        unit = self.unit(scope.resource_id) if scope.resource_id else None
        expected = {ScopeType.DEPARTMENT: UnitType.DEPARTMENT,
                    ScopeType.DIVISION: UnitType.DIVISION}.get(scope.kind)
        return bool(unit and expected and unit.kind == expected
                    and unit.period_id == scope.period_id
                    and unit.id in self.effective_units(actor, scope.period_id))
