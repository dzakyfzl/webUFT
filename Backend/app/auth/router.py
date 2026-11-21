from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field

from app.auth.service import COOKIE, csrf_check, digest, login
from app.auth.models import SessionRow
from app.http import authenticated_user, transaction


router = APIRouter(prefix="/api/admin/auth", tags=["auth"])


class LoginInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9_.-]+$")
    password: str = Field(min_length=1, max_length=256)


@router.post("/login")
def login_route(body: LoginInput, request: Request, response: Response):
    settings = request.app.state.settings
    csrf_check(request, settings)
    with request.app.state.database.transaction() as session:
        result, error = login(session, settings, body.username, body.password,
                              request.client.host if request.client else "unknown")
    if error:
        raise error
    token, stored = result
    response.set_cookie(COOKIE, token, max_age=settings.session_ttl_seconds,
                        httponly=True, secure=settings.secure_cookie, samesite="lax", path="/")
    return {"csrf_token": stored.csrf_token}


@router.post("/logout", status_code=204)
def logout_route(request: Request, response: Response, user=Depends(authenticated_user),
                 session=Depends(transaction, scope="function")):
    stored = session.get(SessionRow, digest(request.cookies[COOKIE]))
    if stored:
        session.delete(stored)
    response.delete_cookie(COOKIE, path="/", secure=request.app.state.settings.secure_cookie,
                           httponly=True, samesite="lax")
