from datetime import date
from pathlib import Path
import os
import re
from uuid import uuid4

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import Field
from sqlalchemy import func, select

from app.audit import record_audit
from app.errors import ApiError
from app.http import current_user, transaction
from app.p1.models import AttachmentRow, ExpenseRow, ReportRow, now
from app.p1.policy import program_access
from app.p1.validation import money, safe_url
from app.programs.service import ensure_version
from app.schemas import Input, VersionInput


router = APIRouter(prefix="/api/admin/programs/{program_id}", tags=["documents", "actuals", "reports"])
MAX_FILE = 20 * 1024 * 1024
TYPES = {".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
         ".webp": "image/webp", ".txt": "text/plain", ".csv": "text/csv"}


def media_root(request):
    path = Path(getattr(request.app.state, "media_dir", None) or os.environ.get("ERP_MEDIA_DIR", "var/media")).resolve()
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    return path


def check_file(name, mime, prefix):
    extension = Path(name).suffix.lower()
    if TYPES.get(extension) != mime:
        raise ApiError(422, "file_type", "Gunakan PDF, PNG, JPEG, WebP, TXT, atau CSV dengan tipe yang sesuai.")
    valid = {".pdf": prefix.startswith(b"%PDF-"), ".png": prefix.startswith(b"\x89PNG\r\n\x1a\n"),
             ".jpg": prefix.startswith(b"\xff\xd8\xff"), ".jpeg": prefix.startswith(b"\xff\xd8\xff"),
             ".webp": prefix.startswith(b"RIFF") and prefix[8:12] == b"WEBP"}
    if extension in (".txt", ".csv"):
        try:
            content = prefix.decode("utf-8-sig")
            valid[extension] = "\x00" not in content and not re.search(r"(?i)<\s*(script|html|svg|iframe)", content)
        except UnicodeDecodeError:
            valid[extension] = False
    if not valid.get(extension):
        raise ApiError(422, "file_signature", "Isi file tidak sesuai tipe berkas.")


def attachment_dto(row):
    return {"id": row.id, "name": row.name, "mime": row.mime, "size": row.size,
            "external_url": row.external_url, "created_at": row.created_at}


@router.get("/documents")
def documents(program_id: str, offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100),
              user=Depends(current_user), session=Depends(transaction, scope="function")):
    program_access(session, user.id, program_id)
    rows = session.scalars(select(AttachmentRow).where(AttachmentRow.program_id == program_id,
        AttachmentRow.deleted_at.is_(None)).order_by(AttachmentRow.created_at.desc(), AttachmentRow.id).offset(offset).limit(limit + 1)).all()
    return {"items": [attachment_dto(row) for row in rows[:limit]], "has_more": len(rows) > limit}


@router.post("/documents/upload", status_code=201)
async def upload(program_id: str, request: Request, name: str = Query(min_length=1, max_length=180),
                 user=Depends(current_user), session=Depends(transaction, scope="function")):
    # Check authorization before receiving bytes, then lock/recheck after streaming.
    _, actor, policy = program_access(session, user.id, program_id)
    from app.permissions.policy import Action
    if not policy.allows(actor, Action.EDIT_PROGRAM, program_id=program_id):
        raise ApiError(403, "forbidden", "Assignment Proker diperlukan untuk mengunggah dokumen.")
    if "/" in name or "\\" in name or any(ord(c) < 32 for c in name):
        raise ApiError(422, "filename", "Nama file tidak valid.")
    mime = request.headers.get("content-type", "").split(";")[0].lower()
    if TYPES.get(Path(name).suffix.lower()) != mime:
        raise ApiError(422, "file_type", "Tipe atau ekstensi file tidak didukung.")
    try:
        length = int(request.headers.get("content-length", "0"))
    except ValueError:
        raise ApiError(422, "file_length", "Ukuran file tidak valid.") from None
    if length > MAX_FILE:
        raise ApiError(413, "file_too_large", "Maksimal 20 MB per file. Gunakan tautan Drive untuk file besar.")
    storage_key = str(uuid4())
    path = media_root(request) / storage_key
    size, prefix = 0, b""
    try:
        with path.open("xb") as target:
            os.chmod(path, 0o600)
            async for chunk in request.stream():
                size += len(chunk)
                if size > MAX_FILE:
                    raise ApiError(413, "file_too_large", "Maksimal 20 MB per file.")
                if len(prefix) < 512:
                    prefix += chunk[:512 - len(prefix)]
                target.write(chunk)
        if size == 0:
            raise ApiError(422, "empty_file", "File tidak boleh kosong.")
        check_file(name, mime, prefix)
        program, actor, _ = program_access(session, user.id, program_id, write=True)
        row = AttachmentRow(program_id=program_id, name=name, mime=mime, size=size,
                            storage_key=storage_key, created_by=user.id)
        session.add(row)
        session.flush()
        record_audit(session, actor=actor, action="document.created", resource_id=row.id,
            period_id=program.period_id, after={"name": name, "size": size, "mime": mime})
        session.flush()
        return attachment_dto(row)
    except BaseException:
        path.unlink(missing_ok=True)
        raise


class LinkInput(Input):
    name: str = Field(min_length=1, max_length=180)
    external_url: str = Field(min_length=1, max_length=2000)


@router.post("/documents/links", status_code=201)
def document_link(program_id: str, body: LinkInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    program, actor, _ = program_access(session, user.id, program_id, write=True)
    safe_url(body.external_url)
    row = AttachmentRow(program_id=program_id, name=body.name, mime="text/uri-list", size=0,
                        external_url=body.external_url, created_by=user.id)
    session.add(row)
    session.flush()
    record_audit(session, actor=actor, action="document.link.created", resource_id=row.id, period_id=program.period_id,
                 after={"name": row.name})
    return attachment_dto(row)


@router.get("/documents/{document_id}/download")
def download(program_id: str, document_id: str, request: Request, user=Depends(current_user), session=Depends(transaction, scope="function")):
    program_access(session, user.id, program_id)
    row = session.get(AttachmentRow, document_id)
    if row is None or row.program_id != program_id or row.deleted_at:
        raise ApiError(404, "not_found", "Berkas tidak ditemukan.")
    if row.external_url:
        return RedirectResponse(safe_url(row.external_url), status_code=307, headers={"Cache-Control": "no-store"})
    path = media_root(request) / row.storage_key
    if not path.is_file():
        raise ApiError(404, "file_missing", "Berkas belum tersedia pada storage.")
    return FileResponse(path, media_type=row.mime, filename=row.name, content_disposition_type="attachment",
                        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "no-store"})


@router.delete("/documents/{document_id}")
def remove_document(program_id: str, document_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    program, actor, _ = program_access(session, user.id, program_id, write=True)
    row = session.get(AttachmentRow, document_id, with_for_update=True)
    if row is None or row.program_id != program_id or row.deleted_at:
        raise ApiError(404, "not_found", "Dokumen tidak ditemukan.")
    if session.scalar(select(ExpenseRow.id).where(ExpenseRow.attachment_id == row.id, ExpenseRow.deleted_at.is_(None))):
        raise ApiError(409, "expense_evidence", "Dokumen masih dipakai sebagai bukti realisasi.")
    if session.scalar(select(ExpenseRow.id).where(ExpenseRow.attachment_id == document_id).limit(1)):
        raise ApiError(409, "evidence_in_use", "Dokumen masih menjadi bukti transaksi. Pertahankan bukti atau ubah tautannya dahulu.")
    row.deleted_at = now()
    record_audit(session, actor=actor, action="document.removed", resource_id=row.id, period_id=program.period_id)
    return {"id": row.id}


class ExpenseInput(Input):
    name: str = Field(min_length=1, max_length=160)
    category: str = Field(default="", max_length=100)
    amount: str
    paid_on: date
    attachment_id: str | None = None
    notes: str = Field(default="", max_length=5000)
    expected_version: int = Field(default=1, ge=1)


def expense_dto(row):
    return {**{key: getattr(row, key) for key in ("id", "name", "category", "paid_on", "notes", "attachment_id", "version")}, "amount": str(row.amount)}


@router.get("/expenses")
def expenses(program_id: str, offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100),
             user=Depends(current_user), session=Depends(transaction, scope="function")):
    from app.programs.operations import budget_dto
    program_access(session, user.id, program_id)
    query = select(ExpenseRow).where(ExpenseRow.program_id == program_id, ExpenseRow.deleted_at.is_(None))
    rows = session.scalars(query.order_by(ExpenseRow.paid_on.desc(), ExpenseRow.id).offset(offset).limit(limit + 1)).all()
    actual = session.scalar(select(func.coalesce(func.sum(ExpenseRow.amount), 0)).where(
        ExpenseRow.program_id == program_id, ExpenseRow.deleted_at.is_(None)))
    planned = budget_dto(session, program_id)["total_rupiah"]
    return {"items": [expense_dto(row) for row in rows[:limit]], "has_more": len(rows) > limit,
        "planned_rupiah": planned, "actual_rupiah": str(actual), "difference_rupiah": str(int(planned) - int(actual))}


def expense_save(session, user_id, program_id, body, expense_id=None):
    program, actor, _ = program_access(session, user_id, program_id, write=True)
    row = session.get(ExpenseRow, expense_id, with_for_update=True) if expense_id else ExpenseRow(program_id=program_id)
    if row is None or row.program_id != program_id or row.deleted_at:
        raise ApiError(404, "not_found", "Realisasi tidak ditemukan.")
    if expense_id:
        ensure_version(row, body.expected_version)
    if body.attachment_id:
        document = session.get(AttachmentRow, body.attachment_id)
        if document is None or document.deleted_at or document.program_id != program_id:
            raise ApiError(422, "foreign_evidence", "Bukti transaksi harus berasal dari Proker yang sama.")
    before = expense_dto(row) if expense_id else None
    for key, value in body.model_dump(exclude={"expected_version", "amount"}).items():
        setattr(row, key, value)
    row.amount, row.version = money(body.amount), (row.version + 1 if expense_id else 1)
    session.add(row)
    session.flush()
    record_audit(session, actor=actor, action="expense.saved", resource_id=row.id, period_id=program.period_id,
                 before={"amount": before["amount"]} if before else None, after={"amount": str(row.amount), "version": row.version})
    return expense_dto(row)


@router.post("/expenses", status_code=201)
def create_expense(program_id: str, body: ExpenseInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return expense_save(session, user.id, program_id, body)


@router.patch("/expenses/{expense_id}")
def update_expense(program_id: str, expense_id: str, body: ExpenseInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    return expense_save(session, user.id, program_id, body, expense_id)


@router.delete("/expenses/{expense_id}")
def remove_expense(program_id: str, expense_id: str, body: VersionInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    program, actor, _ = program_access(session, user.id, program_id, write=True)
    row = session.get(ExpenseRow, expense_id, with_for_update=True)
    if row is None or row.program_id != program_id or row.deleted_at:
        raise ApiError(404, "not_found", "Realisasi tidak ditemukan.")
    ensure_version(row, body.expected_version)
    row.deleted_at, row.version = now(), row.version + 1
    record_audit(session, actor=actor, action="expense.removed", resource_id=row.id, period_id=program.period_id)
    return {"id": row.id}


class ReportInput(Input):
    narrative: str = Field(default="", max_length=15000)
    achievements: str = Field(default="", max_length=10000)
    obstacles: str = Field(default="", max_length=10000)
    documentation_url: str = Field(default="", max_length=2000)
    expected_version: int = Field(default=1, ge=1)


@router.get("/report")
def report(program_id: str, user=Depends(current_user), session=Depends(transaction, scope="function")):
    program_access(session, user.id, program_id)
    row = session.get(ReportRow, program_id)
    return {key: getattr(row, key) for key in ("narrative", "achievements", "obstacles", "documentation_url", "version")} if row else {
        "narrative": "", "achievements": "", "obstacles": "", "documentation_url": "", "version": 1}


@router.put("/report")
def save_report(program_id: str, body: ReportInput, user=Depends(current_user), session=Depends(transaction, scope="function")):
    program, actor, _ = program_access(session, user.id, program_id, write=True)
    row = session.get(ReportRow, program_id, with_for_update=True)
    if row:
        ensure_version(row, body.expected_version)
    safe_url(body.documentation_url, optional=True)
    row = row or ReportRow(program_id=program_id, version=1)
    for key, value in body.model_dump(exclude={"expected_version"}).items():
        setattr(row, key, value)
    row.version += 1
    session.add(row)
    record_audit(session, actor=actor, action="program.report.saved", resource_id=program_id, period_id=program.period_id,
                 after={"version": row.version})
    session.flush()
    return report(program_id, user, session)
