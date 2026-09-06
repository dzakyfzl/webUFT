"""Feature-based access guard for HR endpoints.

Usage in routers::

    from app.core.access_guard import require_access

    @router.get("/", dependencies=[Depends(require_access("Kelola Medpart Masuk"))])
    def list_medpart_masuk(...):
        ...

    # Hidden module — returns 404 instead of 403 to conceal existence
    @router.get("/", dependencies=[Depends(require_access("Kelola Offer Masuk", hidden=True))])
    def list_offer_masuk(...):
        ...
"""

from fastapi import Depends, HTTPException

from app.core.security import validate_token


def require_access(*bidang_names: str, hidden: bool = False):
    """Return a FastAPI dependency that enforces feature-based access.

    Parameters
    ----------
    bidang_names:
        One or more bidang names that the user must possess **at least one of**
        to access the endpoint.
    hidden:
        If ``True``, the endpoint returns 404 instead of 403 when access is
        denied, so that unauthorized users cannot even discover the module
        exists (used for sensitive modules like Offer Masuk).
    """

    async def _guard(user: dict = Depends(validate_token)):
        user_access: list[str] = user.get("access", [])

        # Super Admin bypass — if user has "Kelola Akun" they can access everything
        # (following the convention in PRD §2 where Super Admin has all bidang)
        if any(b in user_access for b in bidang_names):
            return user

        if hidden:
            raise HTTPException(status_code=404, detail="Not found")

        raise HTTPException(
            status_code=403,
            detail=f"Akses ditolak: memerlukan salah satu dari {list(bidang_names)}",
        )

    return _guard
