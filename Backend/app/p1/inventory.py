from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import Field
from sqlalchemy import select

from app.audit import record_audit
from app.errors import ApiError
from app.http import current_user, transaction
from app.p1.models import DigitalAssetRow, LoanRow, PhysicalAssetRow, now
from app.p1.policy import inventory_access
from app.p1.validation import money, no_secrets, safe_url
from app.programs.service import ensure_version
from app.schemas import Input


router = APIRouter(prefix="/api/admin/inventory", tags=["inventory"])
Condition = Literal["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT"]


class PhysicalInput(Input):
    asset_code: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=100)
    location: str = Field(default="", max_length=160)
    custodian: str = Field(default="", max_length=160)
    condition: Condition = "BAIK"
    availability_status: Literal["TERSEDIA", "PERBAIKAN", "HILANG"] = "TERSEDIA"
    photo_url: str = Field(default="", max_length=2000)
    notes: str = Field(default="", max_length=5000)
    expected_version: int = Field(default=1, ge=1)


class DigitalInput(Input):
    name: str = Field(min_length=1, max_length=160)
    kind: Literal["DRIVE_FOLDER", "ACCOUNT", "DOMAIN", "HOSTING", "WEBSITE", "REPOSITORY", "OTHER"]
    url: str = Field(default="", max_length=2000)
    custodian: str = Field(default="", max_length=160)
    status: Literal["ACTIVE", "EXPIRED", "INACTIVE"] = "ACTIVE"
    expires_on: date | None = None
    credential_reference: str = Field(default="", max_length=500)
    notes: str = Field(default="", max_length=5000)
    expected_version: int = Field(default=1, ge=1)


class LoanInput(Input):
    transaction_type: Literal["LOAN", "RENT"]
    borrower_name: str = Field(min_length=1, max_length=160)
    contact: str = Field(default="", max_length=160)
    loan_on: date
    due_on: date
    rental_fee: str = "0"
    notes: str = Field(default="", max_length=5000)
    expected_version: int = Field(ge=1)


class ReturnInput(Input):
    returned_on: date
    condition_after: Condition
    notes: str = Field(default="", max_length=5000)
    expected_version: int = Field(ge=1)


class ArchiveInput(Input):
    expected_version: int = Field(ge=1)


def physical_dto(row):
    return {key: getattr(row, key) for key in ("id", "asset_code", "name", "category", "location", "custodian",
        "condition", "availability_status", "photo_url", "notes", "version", "archived_at")}


def digital_dto(row, manage):
    data = {key: getattr(row, key) for key in ("id", "name", "kind", "version", "archived_at")}
    details = row.details
    data.update({key: details.get(key) for key in ("url", "custodian", "status", "expires_on", "notes")})
    if manage:
        data["credential_reference"] = details.get("credential_reference", "")
    return data


@router.get("/{kind}")
def list_assets(kind: Literal["physical", "digital"], period_id: str, offset: int = Query(0, ge=0),
                limit: int = Query(30, ge=1, le=100), search: str = Query("", max_length=160), archived: bool = False,
                user=Depends(current_user), session=Depends(transaction, scope="function")):
    _, manage = inventory_access(session, user.id, period_id)
    model = PhysicalAssetRow if kind == "physical" else DigitalAssetRow
    query = select(model).where(model.archived_at.is_not(None) if archived else model.archived_at.is_(None))
    if search.strip():
        query = query.where(model.name.icontains(search.strip(), autoescape=True))
    rows = session.scalars(query.order_by(model.name, model.id).offset(offset).limit(limit + 1)).all()
    return {"items": [physical_dto(row) if kind == "physical" else digital_dto(row, manage) for row in rows[:limit]],
            "has_more": len(rows) > limit, "can_manage": manage}


def save_asset(session, user, period_id, body, kind, asset_id=None):
    actor, _ = inventory_access(session, user.id, period_id, manage=True)
    model = PhysicalAssetRow if kind == "physical" else DigitalAssetRow
    row = session.get(model, asset_id, with_for_update=True, populate_existing=True) if asset_id else model()
    if row is None:
        raise ApiError(404, "not_found", "Aset tidak ditemukan.")
    if asset_id:
        ensure_version(row, body.expected_version)
        if row.archived_at:
            raise ApiError(409, "archived", "Aset sudah diarsipkan.")
        if kind == "physical" and session.scalar(select(LoanRow.id).where(LoanRow.asset_id == row.id, LoanRow.returned_on.is_(None))):
            raise ApiError(409, "open_loan", "Selesaikan transaksi peminjaman sebelum mengubah aset.")
    data = body.model_dump(exclude={"expected_version"}, mode="json")
    if kind == "physical":
        safe_url(data["photo_url"], optional=True)
        if data["condition"] != "BAIK" and data["availability_status"] == "TERSEDIA":
            raise ApiError(422, "asset_condition", "Aset rusak harus berstatus perbaikan atau hilang.")
        for key, value in data.items():
            setattr(row, key, value)
    else:
        safe_url(data["url"], optional=True)
        for value in (data["credential_reference"], data["notes"], data["url"]):
            no_secrets(value)
        row.name, row.kind = data.pop("name"), data.pop("kind")
        row.details = data
    row.version = (row.version + 1) if asset_id else 1
    session.add(row)
    session.flush()
    record_audit(session, actor=actor, action=f"asset.{kind}.saved", resource_id=row.id, period_id=period_id,
                 after={"name": row.name, "version": row.version})
    return physical_dto(row) if kind == "physical" else digital_dto(row, True)


@router.post("/physical", status_code=201)
def create_physical(period_id: str, body: PhysicalInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return save_asset(session, user, period_id, body, "physical")


@router.patch("/physical/{asset_id}")
def update_physical(asset_id: str, period_id: str, body: PhysicalInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return save_asset(session, user, period_id, body, "physical", asset_id)


@router.post("/digital", status_code=201)
def create_digital(period_id: str, body: DigitalInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return save_asset(session, user, period_id, body, "digital")


@router.patch("/digital/{asset_id}")
def update_digital(asset_id: str, period_id: str, body: DigitalInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return save_asset(session, user, period_id, body, "digital", asset_id)


@router.post("/{kind}/{asset_id}/archive")
def archive_asset(kind: Literal["physical", "digital"], asset_id: str, period_id: str, body: ArchiveInput,
                  user=Depends(current_user), session=Depends(transaction, scope="function")):
    actor, _ = inventory_access(session, user.id, period_id, manage=True)
    row = session.get(PhysicalAssetRow if kind == "physical" else DigitalAssetRow, asset_id, with_for_update=True)
    if row is None:
        raise ApiError(404, "not_found", "Aset tidak ditemukan.")
    ensure_version(row, body.expected_version)
    if kind == "physical" and session.scalar(select(LoanRow.id).where(LoanRow.asset_id == asset_id, LoanRow.returned_on.is_(None))):
        raise ApiError(409, "open_loan", "Aset masih dipinjam atau disewa.")
    row.archived_at, row.version = now(), row.version + 1
    record_audit(session, actor=actor, action="asset.archived", resource_id=row.id, period_id=period_id)
    return {"id": row.id, "version": row.version}


@router.get("/physical/{asset_id}/loans")
def list_loans(asset_id: str, period_id: str, offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100),
               user=Depends(current_user), session=Depends(transaction, scope="function")):
    inventory_access(session, user.id, period_id, manage=True)
    rows = session.scalars(select(LoanRow).where(LoanRow.asset_id == asset_id).order_by(
        LoanRow.loan_on.desc(), LoanRow.id).offset(offset).limit(limit + 1)).all()
    return {"items": [loan_dto(row, session) for row in rows[:limit]], "has_more": len(rows) > limit}


def loan_dto(row, session=None):
    from zoneinfo import ZoneInfo
    from datetime import datetime
    data = {key: getattr(row, key) for key in ("id", "asset_id", "transaction_type", "borrower_name", "contact",
        "loan_on", "due_on", "returned_on", "condition_before", "condition_after", "notes", "logged_by", "returned_by", "version")}
    data["rental_fee"] = str(row.rental_fee)
    data["overdue"] = row.returned_on is None and row.due_on < datetime.now(ZoneInfo("Asia/Jakarta")).date()
    if session is not None:
        from app.audit import AuditRow
        events = session.scalars(select(AuditRow).where(AuditRow.resource_id == row.id,
            AuditRow.action.in_(("asset.loan.created", "asset.loan.returned")))).all()
        data["logged_by_name"] = next((event.actor_name for event in events if event.action == "asset.loan.created"), "")
        data["returned_by_name"] = next((event.actor_name for event in events if event.action == "asset.loan.returned"), "")
    return data


@router.post("/physical/{asset_id}/loans", status_code=201)
def create_loan(asset_id: str, period_id: str, body: LoanInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    actor, _ = inventory_access(session, user.id, period_id, manage=True)
    asset = session.get(PhysicalAssetRow, asset_id, with_for_update=True, populate_existing=True)
    if asset is None:
        raise ApiError(404, "not_found", "Aset tidak ditemukan.")
    ensure_version(asset, body.expected_version)
    if asset.archived_at or asset.availability_status != "TERSEDIA" or asset.condition != "BAIK":
        raise ApiError(409, "unavailable", "Aset tidak tersedia untuk dipinjam atau disewa.")
    if body.due_on < body.loan_on:
        raise ApiError(422, "loan_dates", "Tanggal kembali rencana harus sesudah tanggal keluar.")
    fee = money(body.rental_fee)
    if body.transaction_type == "LOAN" and fee:
        raise ApiError(422, "loan_fee", "Gunakan transaksi sewa untuk biaya sewa.")
    row = LoanRow(asset_id=asset_id, transaction_type=body.transaction_type, borrower_name=body.borrower_name,
        contact=body.contact, loan_on=body.loan_on, due_on=body.due_on, rental_fee=fee,
        condition_before=asset.condition, notes=body.notes, logged_by=user.id)
    session.add(row)
    asset.availability_status = "DIPINJAM" if body.transaction_type == "LOAN" else "DISEWAKAN"
    asset.version += 1
    session.flush()
    record_audit(session, actor=actor, action="asset.loan.created", resource_id=row.id, period_id=period_id,
        after={"asset_id": asset_id, "transaction_type": row.transaction_type})
    session.flush()
    return loan_dto(row, session)


@router.post("/physical/{asset_id}/loans/{loan_id}/return")
def return_loan(asset_id: str, loan_id: str, period_id: str, body: ReturnInput,
                user=Depends(current_user), session=Depends(transaction, scope="function")):
    actor, _ = inventory_access(session, user.id, period_id, manage=True)
    asset = session.get(PhysicalAssetRow, asset_id, with_for_update=True, populate_existing=True)
    row = session.get(LoanRow, loan_id, with_for_update=True, populate_existing=True)
    if row is None or asset is None or row.asset_id != asset_id:
        raise ApiError(404, "not_found", "Transaksi tidak ditemukan.")
    ensure_version(row, body.expected_version)
    if row.returned_on is not None:
        raise ApiError(409, "already_returned", "Transaksi sudah dikembalikan.")
    if body.returned_on < row.loan_on:
        raise ApiError(422, "return_date", "Tanggal kembali tidak boleh sebelum tanggal keluar.")
    row.returned_on, row.condition_after, row.returned_by = body.returned_on, body.condition_after, user.id
    row.notes = body.notes or row.notes
    row.version += 1
    asset.condition = body.condition_after
    asset.availability_status = "TERSEDIA" if body.condition_after == "BAIK" else "PERBAIKAN"
    asset.version += 1
    record_audit(session, actor=actor, action="asset.loan.returned", resource_id=row.id, period_id=period_id,
        after={"asset_id": asset_id, "condition_after": body.condition_after})
    session.flush()
    return loan_dto(row, session)
