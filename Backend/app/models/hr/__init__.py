"""HR module database models.

Import all model classes here so that Alembic's ``target_metadata`` picks them
up via a single ``import app.models.hr`` statement.
"""

from app.models.hr.medpart import MedpartMasuk, MedpartMasukNote  # noqa: F401
from app.models.hr.medpart_sebar import MedpartSebar, MedpartSebarNote  # noqa: F401
from app.models.hr.sponsorship import Sponsor, SponsorProposal, SponsorOffer, SponsorNote  # noqa: F401
from app.models.hr.offer import OfferSponsorshipMasuk, OfferKerjasamaJob  # noqa: F401
from app.models.hr.proker import Proker, ProkerMedpart, ProkerSponsor  # noqa: F401
from app.models.hr.undangan import Undangan, UndanganAssignment  # noqa: F401
from app.models.hr.reminder import Reminder  # noqa: F401
from app.models.hr.jadwal_poster import JadwalPoster  # noqa: F401
from app.models.hr.aspirasi import AspirasiSettings, AspirasiRiwayat  # noqa: F401
from app.models.hr.template_chat import TemplateChat  # noqa: F401
from app.models.hr.audit_log import AuditLog  # noqa: F401
from app.models.hr.ai_settings import GeminiApiKey, GeminiModelSetting  # noqa: F401
