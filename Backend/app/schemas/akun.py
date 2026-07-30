from pydantic import BaseModel


class AkunCreate(BaseModel):
    username: str
    password: str


class LogoutRequest(BaseModel):
    refresh_token: str
