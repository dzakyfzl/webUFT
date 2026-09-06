"""FastAPI dependency factories for HR services."""

from fastapi import Depends

from app.core.database import get_db
from app.repositories.hr.jadwal_poster_repo import JadwalPosterRepository
from app.repositories.hr.medpart_masuk_repo import MedpartMasukRepository
from app.repositories.hr.medpart_sebar_repo import MedpartSebarRepository
from app.repositories.hr.offer_repo import OfferKerjasamaRepository, OfferSponsorshipRepository
from app.repositories.hr.sponsorship_repo import SponsorRepository
from app.repositories.hr.template_chat_repo import TemplateChatRepository
from app.repositories.hr.proker_repo import ProkerRepository
from app.repositories.hr.undangan_repo import UndanganRepository
from app.repositories.hr.reminder_repo import ReminderRepository
from app.repositories.hr.aspirasi_repo import AspirasiRepository
from app.services.hr.audit_service import AuditService
from app.services.hr.jadwal_poster_service import JadwalPosterService
from app.services.hr.medpart_masuk_service import MedpartMasukService
from app.services.hr.medpart_sebar_service import MedpartSebarService
from app.services.hr.offer_kerjasama_service import OfferKerjasamaService
from app.services.hr.offer_sponsorship_service import OfferSponsorshipService
from app.services.hr.sponsorship_service import SponsorshipService
from app.services.hr.template_chat_service import TemplateChatService
from app.services.hr.proker_undangan_service import (
    ProkerService,
    UndanganService,
    ReminderService,
    AspirasiService,
)


def get_audit_service(db=Depends(get_db)):
    return AuditService(db)


def get_medpart_masuk_service(db=Depends(get_db)):
    return MedpartMasukService(MedpartMasukRepository(db), AuditService(db))


def get_medpart_sebar_service(db=Depends(get_db)):
    return MedpartSebarService(MedpartSebarRepository(db), AuditService(db))


def get_sponsorship_service(db=Depends(get_db)):
    return SponsorshipService(SponsorRepository(db), AuditService(db))


def get_offer_sponsorship_service(db=Depends(get_db)):
    return OfferSponsorshipService(OfferSponsorshipRepository(db), AuditService(db))


def get_offer_kerjasama_service(db=Depends(get_db)):
    return OfferKerjasamaService(OfferKerjasamaRepository(db), AuditService(db))


def get_jadwal_poster_service(db=Depends(get_db)):
    return JadwalPosterService(JadwalPosterRepository(db), AuditService(db))


def get_template_chat_service(db=Depends(get_db)):
    return TemplateChatService(TemplateChatRepository(db))


def get_proker_service(db=Depends(get_db)):
    return ProkerService(ProkerRepository(db))


def get_undangan_service(db=Depends(get_db)):
    return UndanganService(UndanganRepository(db))


def get_reminder_service(db=Depends(get_db)):
    return ReminderService(ReminderRepository(db))


def get_aspirasi_service(db=Depends(get_db)):
    return AspirasiService(AspirasiRepository(db))
