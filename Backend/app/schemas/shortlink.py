import re

from pydantic import BaseModel, field_validator, HttpUrl


class ShortLinkCreate(BaseModel):
    slug: str
    destinationUrl: str

    @field_validator("slug")
    @classmethod
    def slug_must_be_url_safe(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Slug tidak boleh kosong")
        if len(v) > 100:
            raise ValueError("Slug maksimal 100 karakter")
        if not re.fullmatch(r"[a-zA-Z0-9_-]+", v):
            raise ValueError("Slug hanya boleh mengandung huruf, angka, tanda hubung (-), dan underscore (_)")
        return v

    @field_validator("destinationUrl")
    @classmethod
    def url_must_be_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL tujuan tidak boleh kosong")
        if not re.match(r"^https?://", v, re.IGNORECASE):
            raise ValueError("URL tujuan harus diawali dengan http:// atau https://")
        if len(v) > 2048:
            raise ValueError("URL tujuan terlalu panjang (maks 2048 karakter)")
        return v


class ShortLinkResponse(BaseModel):
    linkID: int
    slug: str
    destinationUrl: str

    model_config = {"from_attributes": True}