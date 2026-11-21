"""Single metadata registration point, shared by application and Alembic."""

from app import audit  # noqa: F401
from app.auth import models as auth_models  # noqa: F401
from app.organization import models as organization_models  # noqa: F401
from app.programs import models as program_models  # noqa: F401
from app.work import models as work_models  # noqa: F401
from app.p1 import models as p1_models  # noqa: F401
from app.db import Base

__all__ = ["Base"]
