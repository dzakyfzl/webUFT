"""Router for Global Audit Log HR."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.access_guard import require_access
from app.services.hr.audit_service import AuditService
from app.services.hr.dependencies import get_audit_service

router = APIRouter(prefix="/audit-log", tags=["HR - Audit Log"])


@router.get("/", response_model=dict)
def list_audit_logs(
    modul: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(None, description="ISO 8601 format"),
    date_to: Optional[datetime] = Query(None, description="ISO 8601 format"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: AuditService = Depends(get_audit_service),
    user=Depends(require_access("Kelola Audit Log")),
):
    """
    Ambil global audit log HR dengan filter opsional.

    - **modul**: filter by modul (medpart_masuk, sponsor, dll.)
    - **user_id**: filter by akun yang melakukan aksi
    - **date_from / date_to**: filter rentang tanggal (inclusive)
    """
    items = svc.get_global_logs(
        modul=modul,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )
    total = svc.count_global_logs(
        modul=modul,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
    )
    return {
        "data": [
            {
                "id": log.id,
                "modul": log.modul,
                "record_id": log.record_id,
                "aksi": log.aksi,
                "user_id": log.user_id,
                "user_nama": log.user_nama,
                "field_key": log.field_key,
                "nilai_lama": log.nilai_lama,
                "nilai_baru": log.nilai_baru,
                "via_ai": log.via_ai,
                "created_at": log.created_at.isoformat(),
            }
            for log in items
        ],
        "total": total,
    }


@router.get("/moduls")
def list_moduls(
    svc: AuditService = Depends(get_audit_service),
    user=Depends(require_access("Kelola Audit Log")),
):
    """Ambil daftar modul unik yang ada di audit log."""
    return {"moduls": svc.get_distinct_moduls()}
