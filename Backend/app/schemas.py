"""Common request validation primitives; no router or service dependencies."""

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("*", mode="after")
    @classmethod
    def meaningful_labels(cls, value, info):
        if info.field_name in {"name", "display_name", "title", "chairperson_name", "label", "unit", "role"}:
            if isinstance(value, str) and not value.strip():
                raise ValueError("Nama atau label tidak boleh kosong")
            return value.strip() if isinstance(value, str) else value
        # Passwords must retain intentional leading/trailing whitespace.
        return value


class VersionInput(Input):
    expected_version: int = Field(ge=1)
