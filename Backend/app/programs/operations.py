"""Committee and RAB commands share the program/period mutation locks."""

from dataclasses import dataclass
from sqlalchemy import delete, select

from app.audit import record_audit
from app.authorization import require
from app.budgets.money import BudgetLine, decimal_input, total_rupiah
from app.errors import ApiError
from app.organization.models import identifier
from app.permissions.policy import Action
from app.programs.models import BudgetRow, CommitteeGroupRow, CommitteeMemberRow
from app.programs.service import ensure_version, lock_program
from app.work.models import TaskRow


def committee_dto(session, program_id):
    groups = session.scalars(select(CommitteeGroupRow).where(CommitteeGroupRow.program_id == program_id)
                             .order_by(CommitteeGroupRow.sort_order, CommitteeGroupRow.id)).all()
    members = session.scalars(select(CommitteeMemberRow).where(CommitteeMemberRow.program_id == program_id)
                              .order_by(CommitteeMemberRow.display_name, CommitteeMemberRow.id)).all()
    return {"groups": [{"id": g.id, "label": g.label, "parent_id": g.parent_id,
                        "sort_order": g.sort_order} for g in groups],
            "members": [{"id": m.id, "display_name": m.display_name, "role": m.role,
                         "group_id": m.group_id, "user_id": m.user_id} for m in members]}


def structure(session, user_id, program_id, body):
    program = lock_program(session, program_id)
    actor, _ = require(session, user_id, Action.MANAGE_COMMITTEE_STRUCTURE, program_id=program_id)
    ensure_version(program, body.expected_version)
    before = committee_dto(session, program_id)["groups"]
    proposed = {g.id: g for g in body.groups}
    if len(proposed) != len(body.groups):
        raise ApiError(422, "duplicate_group", "ID kelompok panitia tidak boleh berulang.")
    for group in body.groups:
        seen = {group.id}
        parent = group.parent_id
        while parent is not None:
            if parent in seen or parent not in proposed:
                raise ApiError(422, "invalid_hierarchy", "Struktur panitia tidak boleh bersiklus atau merujuk kelompok di luar Proker.")
            seen.add(parent)
            parent = proposed[parent].parent_id
    existing = {g["id"] for g in before}
    removed = existing - proposed.keys()
    if removed and session.scalar(select(CommitteeMemberRow.id).where(
            CommitteeMemberRow.program_id == program_id, CommitteeMemberRow.group_id.in_(removed)).limit(1)):
        raise ApiError(409, "group_in_use", "Pindahkan anggota sebelum menghapus kelompok panitia.")
    # Clear parent links first so arbitrary reorder/reparent/delete is FK-safe.
    rows = session.scalars(select(CommitteeGroupRow).where(CommitteeGroupRow.program_id == program_id)).all()
    for row in rows:
        row.parent_id = None
    session.flush()
    if removed:
        session.execute(delete(CommitteeGroupRow).where(CommitteeGroupRow.id.in_(removed)))
    for group in body.groups:
        row = session.get(CommitteeGroupRow, group.id)
        if row and row.program_id != program_id:
            raise ApiError(422, "foreign_group", "Kelompok panitia berasal dari Proker lain.")
        if row is None:
            row = CommitteeGroupRow(id=group.id, program_id=program_id, label=group.label, sort_order=group.sort_order)
            session.add(row)
        else:
            row.label = group.label
            row.sort_order = group.sort_order
    session.flush()
    for group in body.groups:
        session.get(CommitteeGroupRow, group.id).parent_id = group.parent_id
    program.version += 1
    session.flush()
    after = committee_dto(session, program_id)
    record_audit(session, actor=actor, action="committee.structure_updated", resource_id=program_id,
                 period_id=program.period_id, before={"groups": before}, after={"groups": after["groups"]})
    return {**after, "version": program.version}


def template(session, user_id, program_id, body):
    program = lock_program(session, program_id)
    require(session, user_id, Action.MANAGE_COMMITTEE_STRUCTURE, program_id=program_id)
    if committee_dto(session, program_id)["groups"]:
        raise ApiError(409, "template_not_empty", "Template hanya dapat diterapkan pada struktur kosong.")
    @dataclass
    class GroupSpec:
        id: str
        label: str
        parent_id: str | None
        sort_order: int

    @dataclass
    class StructureSpec:
        expected_version: int
        groups: list[GroupSpec]
    groups = []
    for index, label in enumerate(("Pimpinan Pelaksana", "Ketua Pelaksana", "Wakil Ketua", "Sekben",
                                   "Sekretaris", "Bendahara", "Humas", "Acara", "PDD", "Logistik")):
        parent = groups[0].id if index in (1, 2) else groups[3].id if index in (4, 5) else None
        groups.append(GroupSpec(id=identifier(), label=label, parent_id=parent, sort_order=index))
    return structure(session, user_id, program_id,
                     StructureSpec(expected_version=body.expected_version, groups=groups))


def member(session, user_id, program_id, body, member_id=None, remove=False):
    program = lock_program(session, program_id)
    actor, policy = require(session, user_id, Action.EDIT_PROGRAM, program_id=program_id)
    ensure_version(program, body.expected_version)
    row = session.get(CommitteeMemberRow, member_id) if member_id else None
    if member_id and (row is None or row.program_id != program_id):
        raise ApiError(404, "not_found", "Anggota panitia tidak ditemukan.")
    before = None if row is None else {"display_name": row.display_name, "role": row.role, "group_id": row.group_id}
    if remove:
        if session.scalar(select(TaskRow.id).where(TaskRow.committee_member_id == row.id).limit(1)):
            raise ApiError(409, "member_in_use", "Panitia masih dirujuk tugas. Lepaskan referensi terlebih dahulu.")
        session.delete(row)
    else:
        if body.group_id:
            group = session.get(CommitteeGroupRow, body.group_id)
            if group is None or group.program_id != program_id:
                raise ApiError(422, "foreign_group", "Kelompok panitia tidak sesuai Proker.")
        if body.user_id:
            from app.authorization import actor_snapshot
            if not policy.current_member(actor_snapshot(session, body.user_id), program.period_id):
                raise ApiError(422, "inactive_member", "Akun panitia harus pengurus aktif periode ini.")
        if row is None:
            row = CommitteeMemberRow(program_id=program_id)
            session.add(row)
        row.display_name, row.role, row.group_id, row.user_id = body.display_name, body.role, body.group_id, body.user_id
    program.version += 1
    session.flush()
    record_audit(session, actor=actor, action="committee.member_removed" if remove else "committee.member_saved",
                 resource_id=program_id, period_id=program.period_id, before=before,
                 after=None if remove else {"display_name": row.display_name, "role": row.role, "group_id": row.group_id})
    return {"id": row.id, "version": program.version}


def budget_line(row):
    return BudgetLine(row.name, row.category, format(row.quantity, "f"), row.unit,
                      format(row.unit_price, "f"), row.notes)


def budget_dto(session, program_id):
    rows = session.scalars(select(BudgetRow).where(BudgetRow.program_id == program_id).order_by(BudgetRow.id)).all()
    lines = [budget_line(row) for row in rows]
    return {"items": [{"id": row.id, "name": row.name, "category": row.category,
                       "quantity": format(row.quantity, "f"), "unit": row.unit,
                       "unit_price": format(row.unit_price, "f"), "notes": row.notes,
                       "total_rupiah": str(line.total_rupiah), "version": row.version} for row, line in zip(rows, lines)],
            "total_rupiah": str(total_rupiah(lines))}


def budget_save(session, user_id, program_id, body, line_id=None, remove=False):
    program = lock_program(session, program_id)
    actor, _ = require(session, user_id, Action.EDIT_PROGRAM, program_id=program_id)
    row = session.get(BudgetRow, line_id, with_for_update=True) if line_id else None
    if line_id and (row is None or row.program_id != program_id):
        raise ApiError(404, "not_found", "Item RAB tidak ditemukan.")
    if row:
        ensure_version(row, body.expected_version)
    before = None if row is None else {"quantity": format(row.quantity, "f"), "unit_price": format(row.unit_price, "f")}
    if remove:
        session.delete(row)
    else:
        try:
            values = BudgetLine(body.name, body.category, body.quantity, body.unit, body.unit_price, body.notes)
        except ValueError as error:
            raise ApiError(422, "invalid_budget", str(error)) from None
        if row is None:
            row = BudgetRow(program_id=program_id)
            session.add(row)
        else:
            row.version += 1
        row.name, row.category, row.unit, row.notes = values.name, values.category, values.unit, values.notes
        row.quantity, row.unit_price = decimal_input(values.quantity, positive=True), decimal_input(values.unit_price)
    session.flush()
    record_audit(session, actor=actor, action="budget.removed" if remove else "budget.saved",
                 resource_id=program_id, period_id=program.period_id, before=before,
                 after=None if remove else {"quantity": format(row.quantity, "f"), "unit_price": format(row.unit_price, "f")})
    return budget_dto(session, program_id)
