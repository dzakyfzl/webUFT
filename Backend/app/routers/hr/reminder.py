"""Router for Reminder and Overdue Engine."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.access_guard import require_access
from app.schemas.hr.proker_undangan import (
    ReminderCreate,
    ReminderResponse,
    ReminderUpdate,
)
from app.services.hr.dependencies import get_reminder_service

router = APIRouter(prefix="/reminder", tags=["HR - Reminder"])


@router.get("/dashboard")
def get_dashboard(
    svc=Depends(get_reminder_service),
    user=Depends(require_access("Kelola Reminder")),
):
    """Ambil 3 section reminder: Overdue, Mendekati Deadline (≤3 hari), Akan Datang."""
    return svc.get_dashboard()


@router.get("/", response_model=dict)
def list_reminders(
    jenis: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc=Depends(get_reminder_service),
    user=Depends(require_access("Kelola Reminder")),
):
    return svc.list_all(jenis=jenis, status=status, assigned_to=assigned_to, skip=skip, limit=limit)


@router.post("/", response_model=ReminderResponse, status_code=201)
def create_reminder(
    data: ReminderCreate,
    svc=Depends(get_reminder_service),
    user=Depends(require_access("Kelola Reminder")),
):
    return svc.create(data)


@router.patch("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: int,
    data: ReminderUpdate,
    svc=Depends(get_reminder_service),
    user=Depends(require_access("Kelola Reminder")),
):
    return svc.update(reminder_id, data)


@router.post("/{reminder_id}/selesai", response_model=ReminderResponse)
def mark_done(
    reminder_id: int,
    svc=Depends(get_reminder_service),
    user=Depends(require_access("Kelola Reminder")),
):
    return svc.mark_done(reminder_id)


@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    svc=Depends(get_reminder_service),
    user=Depends(require_access("Kelola Reminder")),
):
    return svc.delete(reminder_id)


@router.post("/sync-overdue")
def sync_overdue(
    svc=Depends(get_reminder_service),
    user=Depends(require_access("Kelola Reminder")),
):
    """Manual trigger sync overdue (biasanya dipanggil APScheduler tiap jam)."""
    return svc.run_overdue_sync()
