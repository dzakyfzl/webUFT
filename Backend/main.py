from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.repositories.bootstrap_repository import BootstrapRepository
from app.repositories.hr.jadwal_poster_repo import JadwalPosterRepository
from app.repositories.hr.reminder_repo import ReminderRepository
from app.repositories.hr.aspirasi_repo import AspirasiRepository
from app.routers import acara, akun, album, file, form, foto, karya, shortlink
from app.routers.hr import medpart_masuk as hr_medpart_masuk
from app.routers.hr import medpart_sebar as hr_medpart_sebar
from app.routers.hr import sponsorship as hr_sponsorship
from app.routers.hr import offer_sponsorship as hr_offer_sponsorship
from app.routers.hr import offer_kerjasama as hr_offer_kerjasama
from app.routers.hr import jadwal_poster as hr_jadwal_poster
from app.routers.hr import template_chat as hr_template_chat
from app.routers.hr import proker as hr_proker
from app.routers.hr import undangan as hr_undangan
from app.routers.hr import reminder as hr_reminder
from app.routers.hr import aspirasi as hr_aspirasi
from app.routers.hr import audit_log as hr_audit_log
from app.services.bootstrap_service import BootstrapService


# ---- APScheduler Jobs ----

def _sync_jadwal_overdue():
    """Setiap jam: update JadwalPoster yang melewati deadline → status Telat."""
    db: Session = SessionLocal()
    try:
        count = JadwalPosterRepository(db).mark_overdue()
        if count:
            print(f"[Scheduler] JadwalPoster overdue: {count} updated")
    finally:
        db.close()


def _sync_reminder_overdue():
    """Setiap jam: update Reminder yang melewati deadline → status Overdue."""
    db: Session = SessionLocal()
    try:
        count = ReminderRepository(db).mark_overdue()
        if count:
            print(f"[Scheduler] Reminder overdue: {count} updated")
    finally:
        db.close()


def _sync_aspirasi_monthly():
    """Setiap tanggal 1: pastikan record aspirasi bulan ini ada + mark overdue bulan lalu."""
    db: Session = SessionLocal()
    try:
        repo = AspirasiRepository(db)
        entity = repo.ensure_riwayat_bulan_ini()
        overdue = repo.mark_overdue_riwayat()
        print(f"[Scheduler] Aspirasi bulan ini: id={entity.id}, overdue updated: {overdue}")
    finally:
        db.close()


scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Bootstrap bidang & akun default
    db = SessionLocal()
    try:
        BootstrapService(BootstrapRepository(db)).initialize("bidang.json")
    finally:
        db.close()

    # Setup APScheduler jobs
    scheduler.add_job(_sync_jadwal_overdue, "interval", hours=1, id="jadwal_overdue")
    scheduler.add_job(_sync_reminder_overdue, "interval", hours=1, id="reminder_overdue")
    scheduler.add_job(_sync_aspirasi_monthly, "cron", day=1, hour=0, minute=5, id="aspirasi_monthly")
    scheduler.start()

    yield

    scheduler.shutdown()
    print("App Shutdown")


app = FastAPI(root_path="/api", docs_url="/docs", lifespan=lifespan)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}


# --- Core Routers ---
app.include_router(acara.router)
app.include_router(akun.router)
app.include_router(file.router)
app.include_router(karya.router)
app.include_router(form.router)
app.include_router(album.router)
app.include_router(foto.router)
app.include_router(shortlink.router)

# --- HR Module Routers ---
app.include_router(hr_medpart_masuk.router, prefix="/hr")
app.include_router(hr_medpart_sebar.router, prefix="/hr")
app.include_router(hr_sponsorship.router, prefix="/hr")
app.include_router(hr_offer_sponsorship.router, prefix="/hr")
app.include_router(hr_offer_kerjasama.router, prefix="/hr")
app.include_router(hr_jadwal_poster.router, prefix="/hr")
app.include_router(hr_template_chat.router, prefix="/hr")
app.include_router(hr_proker.router, prefix="/hr")
app.include_router(hr_undangan.router, prefix="/hr")
app.include_router(hr_reminder.router, prefix="/hr")
app.include_router(hr_aspirasi.router, prefix="/hr")
app.include_router(hr_audit_log.router, prefix="/hr")
