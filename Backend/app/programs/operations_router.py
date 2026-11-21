from fastapi import APIRouter, Depends
from pydantic import Field

from app.authorization import require
from app.http import current_user, transaction
from app.schemas import Input, VersionInput
from app.permissions.policy import Action
from app.programs import operations


router = APIRouter(prefix="/api/admin/programs/{program_id}", tags=["committee", "budget"])


class GroupInput(Input):
    id: str = Field(min_length=1, max_length=36)
    label: str = Field(min_length=1, max_length=120)
    parent_id: str | None = None
    sort_order: int = Field(default=0, ge=0, le=10000)


class StructureInput(VersionInput):
    groups: list[GroupInput] = Field(max_length=200)


class CommitteeInput(VersionInput):
    display_name: str = Field(min_length=1, max_length=160)
    role: str = Field(min_length=1, max_length=120)
    group_id: str | None = None
    user_id: str | None = None


class BudgetInput(Input):
    name: str = Field(min_length=1, max_length=160)
    category: str = Field(default="", max_length=100)
    quantity: str = Field(min_length=1, max_length=40)
    unit: str = Field(min_length=1, max_length=80)
    unit_price: str = Field(min_length=1, max_length=40)
    notes: str = Field(default="", max_length=4000)
    expected_version: int = Field(default=1, ge=1)


@router.get("/committee")
def get_committee(program_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    require(session, user.id, Action.READ_PROGRESS, program_id=program_id)
    return operations.committee_dto(session, program_id)


@router.put("/committee/structure")
def update_structure(program_id: str, body: StructureInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return operations.structure(session, user.id, program_id, body)


@router.post("/committee/template")
def apply_template(program_id: str, body: VersionInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return operations.template(session, user.id, program_id, body)


@router.post("/committee/members", status_code=201)
def create_member(program_id: str, body: CommitteeInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return operations.member(session, user.id, program_id, body)


@router.put("/committee/members/{member_id}")
def edit_member(program_id: str, member_id: str, body: CommitteeInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return operations.member(session, user.id, program_id, body, member_id)


@router.delete("/committee/members/{member_id}")
def remove_member(program_id: str, member_id: str, body: VersionInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return operations.member(session, user.id, program_id, body, member_id, True)


@router.get("/budget")
def get_budget(program_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    require(session, user.id, Action.READ_PROGRESS, program_id=program_id)
    return operations.budget_dto(session, program_id)


@router.post("/budget", status_code=201)
def create_budget_line(program_id: str, body: BudgetInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return operations.budget_save(session, user.id, program_id, body)


@router.put("/budget/{line_id}")
def edit_budget_line(program_id: str, line_id: str, body: BudgetInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return operations.budget_save(session, user.id, program_id, body, line_id)


@router.delete("/budget/{line_id}")
def remove_budget_line(program_id: str, line_id: str, body: VersionInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return operations.budget_save(session, user.id, program_id, body, line_id, True)
