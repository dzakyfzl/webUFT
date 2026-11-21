from app.permissions.policy import ScopeType
from app.schemas import Input


class ScopeInput(Input):
    period_id: str
    scope_type: ScopeType
    scope_id: str | None = None
