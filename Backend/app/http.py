"""Shared request UoW and authentication dependencies."""

from fastapi import Depends, Request, Security
from fastapi.security import APIKeyCookie

from app.auth.service import COOKIE, authenticate, csrf_check


def transaction(request: Request):
    with request.app.state.database.transaction() as session:
        yield session


cookie_auth = APIKeyCookie(name=COOKIE, auto_error=False)


def authenticated_user(request: Request, token: str | None = Security(cookie_auth),
                       session=Depends(transaction, scope="function")):
    user, stored = authenticate(session, token, require_active_board=False)
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        csrf_check(request, request.app.state.settings, stored)
    return user


def current_user(user=Depends(authenticated_user), session=Depends(transaction, scope="function")):
    from app.authorization import actor_snapshot, policy_snapshot
    from app.errors import ApiError
    if not policy_snapshot(session).readable(actor_snapshot(session, user.id)):
        raise ApiError(403, "inactive_board", "Keanggotaan pengurus aktif diperlukan.")
    return user
