from datetime import date
from decimal import Decimal, InvalidOperation
from enum import StrEnum
import re
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from app.errors import ApiError
from app.schemas import Input


class FieldType(StrEnum):
    SHORT_TEXT = "SHORT_TEXT"
    LONG_TEXT = "LONG_TEXT"
    RADIO = "RADIO"
    DROPDOWN = "DROPDOWN"
    CHECKBOX = "CHECKBOX"
    EMAIL = "EMAIL"
    DATE = "DATE"
    NUMBER = "NUMBER"


class Question(Input):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    label: str = Field(min_length=1, max_length=200)
    type: FieldType
    required: bool = False
    placeholder: str = Field(default="", max_length=200)
    hint: str = Field(default="", max_length=500)
    options: list[str] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def options_valid(self):
        choices = self.type in (FieldType.RADIO, FieldType.DROPDOWN, FieldType.CHECKBOX)
        if (choices and not self.options or len(set(self.options)) != len(self.options)
                or any(not value.strip() or len(value) > 200 for value in self.options)
                or not choices and self.options):
            raise ValueError("Pilihan harus unik, tidak kosong, dan sesuai tipe pertanyaan")
        return self


class Section(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    title: str = Field(default="", max_length=200)
    questions: list[Question] = Field(default_factory=list, max_length=100)


class FormSchema(Input):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=5000)
    sections: list[Section] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def ids_unique(self):
        fields = [field for section in self.sections for field in section.questions]
        if len(fields) > 100 or len({field.id for field in fields}) != len(fields) or len({s.id for s in self.sections}) != len(self.sections):
            raise ValueError("ID pertanyaan/bagian harus unik, maksimal 100 pertanyaan")
        return self


def schema_value(value):
    try:
        return FormSchema.model_validate(value).model_dump(mode="json")
    except ValidationError:
        raise ApiError(422, "invalid_schema", "Periksa judul, ID unik, tipe dan pilihan formulir (maksimal 100 pertanyaan/20 bagian).") from None


def template(title="Pendaftaran"):
    def question(label, type="SHORT_TEXT", **extra):
        return {"id": str(uuid4()), "label": label, "type": type, "required": False, "placeholder": "", "hint": "", "options": [], **extra}
    return {"title": title, "description": "", "sections": [{"id": str(uuid4()), "title": "", "questions": [
        question("Nama Lengkap"), question("NIM"),
        question("Fakultas", "DROPDOWN", options=["FIF", "FKS", "FIK", "FIT", "FRI", "FEB", "FTE"]),
        question("Prodi / Jurusan", placeholder="S1 Informatika")]}]}


def validate_answers(schema, answers):
    fields = {q["id"]: q for section in schema["sections"] for q in section["questions"]}
    if not isinstance(answers, dict) or set(answers) - set(fields):
        raise ApiError(422, "invalid_answers", "Jawaban memuat pertanyaan yang tidak ada pada versi ini.")
    result = {}
    for key, field in fields.items():
        value = answers.get(key)
        if value is None or value == "" or value == []:
            if field["required"]:
                raise ApiError(422, "required_answer", "Lengkapi seluruh pertanyaan wajib.")
            continue
        kind = field["type"]
        valid = isinstance(value, str) and len(value) <= (10000 if kind == "LONG_TEXT" else 2000)
        if kind == "CHECKBOX":
            valid = isinstance(value, list) and len(value) <= 50 and all(isinstance(v, str) and v in field["options"] for v in value)
            valid = valid and len(set(value)) == len(value)
        elif kind in ("RADIO", "DROPDOWN"):
            valid = valid and value in field["options"]
        elif kind == "EMAIL":
            valid = valid and bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value))
        elif kind in ("DATE", "NUMBER") and valid:
            try:
                if kind == "DATE":
                    date.fromisoformat(value)
                else:
                    valid = Decimal(value).is_finite()
            except (ValueError, InvalidOperation):
                valid = False
        if not valid:
            raise ApiError(422, "invalid_answer", "Jawaban tidak sesuai tipe atau pilihan pertanyaan.")
        if isinstance(value, str) and field["required"] and not value.strip():
            raise ApiError(422, "required_answer", "Jawaban wajib tidak boleh hanya spasi.")
        result[key] = value
    return result
