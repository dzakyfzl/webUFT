from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, ForeignKeyConstraint, Index, Numeric, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.organization.models import identifier


def now():
    return datetime.now(timezone.utc)


class AttachmentRow(Base):
    __tablename__ = "attachments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    program_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.programs.id"), index=True)
    name: Mapped[str] = mapped_column(String(180))
    mime: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column()
    storage_key: Mapped[str | None] = mapped_column(String(80), unique=True)
    external_url: Mapped[str | None] = mapped_column(String(2000))
    created_by: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (CheckConstraint("size >= 0 AND size <= 20971520", name="attachment_size"),
        CheckConstraint("(storage_key IS NULL) <> (external_url IS NULL)", name="attachment_source"))


class ExpenseRow(Base):
    __tablename__ = "expenses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    program_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.programs.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(100), default="")
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 0))
    paid_on: Mapped[date] = mapped_column(Date)
    attachment_id: Mapped[str | None] = mapped_column(ForeignKey("erp_ukm.attachments.id"))
    notes: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[int] = mapped_column(default=1)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (CheckConstraint("amount >= 0", name="expense_amount"),)


class ReportRow(Base):
    __tablename__ = "program_reports"
    program_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.programs.id"), primary_key=True)
    narrative: Mapped[str] = mapped_column(Text, default="")
    achievements: Mapped[str] = mapped_column(Text, default="")
    obstacles: Mapped[str] = mapped_column(Text, default="")
    documentation_url: Mapped[str] = mapped_column(String(2000), default="")
    version: Mapped[int] = mapped_column(default=1)


class PhysicalAssetRow(Base):
    __tablename__ = "physical_assets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    asset_code: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(100))
    location: Mapped[str] = mapped_column(String(160), default="")
    custodian: Mapped[str] = mapped_column(String(160), default="")
    condition: Mapped[str] = mapped_column(String(20), default="BAIK")
    availability_status: Mapped[str] = mapped_column(String(20), default="TERSEDIA")
    photo_url: Mapped[str] = mapped_column(String(2000), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[int] = mapped_column(default=1)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        CheckConstraint("condition IN ('BAIK','RUSAK_RINGAN','RUSAK_BERAT')", name="asset_condition"),
        CheckConstraint("availability_status IN ('TERSEDIA','DIPINJAM','DISEWAKAN','PERBAIKAN','HILANG')", name="asset_status"))


class LoanRow(Base):
    __tablename__ = "asset_loans"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    asset_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.physical_assets.id"), index=True)
    transaction_type: Mapped[str] = mapped_column(String(10))
    borrower_name: Mapped[str] = mapped_column(String(160))
    contact: Mapped[str] = mapped_column(String(160), default="")
    loan_on: Mapped[date] = mapped_column(Date)
    due_on: Mapped[date] = mapped_column(Date)
    returned_on: Mapped[date | None] = mapped_column(Date)
    condition_before: Mapped[str] = mapped_column(String(20))
    condition_after: Mapped[str | None] = mapped_column(String(20))
    rental_fee: Mapped[Decimal] = mapped_column(Numeric(19, 0), default=0)
    notes: Mapped[str] = mapped_column(Text, default="")
    logged_by: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"))
    returned_by: Mapped[str | None] = mapped_column(ForeignKey("erp_ukm.users.id"))
    version: Mapped[int] = mapped_column(default=1)
    __table_args__ = (
        CheckConstraint("transaction_type IN ('LOAN','RENT')", name="loan_type"),
        CheckConstraint("due_on >= loan_on AND (returned_on IS NULL OR returned_on >= loan_on)", name="loan_dates"),
        CheckConstraint("rental_fee >= 0", name="rental_amount"),
        Index("uq_asset_one_open_loan", "asset_id", unique=True, postgresql_where=text("returned_on IS NULL")))


class DigitalAssetRow(Base):
    __tablename__ = "digital_assets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    name: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(40))
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    url: Mapped[str] = mapped_column(String(2000), default="")
    manager: Mapped[str] = mapped_column(String(160), default="")
    status: Mapped[str] = mapped_column(String(80), default="ACTIVE")
    expires_on: Mapped[date | None] = mapped_column(Date)
    credential_reference: Mapped[str] = mapped_column(String(300), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[int] = mapped_column(default=1)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class EventRow(Base):
    __tablename__ = "public_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    period_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.periods.id"), index=True)
    program_id: Mapped[str | None] = mapped_column(ForeignKey("erp_ukm.programs.id"), index=True)
    owner_user_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    location: Mapped[str] = mapped_column(String(200), default="")
    poster_url: Mapped[str] = mapped_column(String(2000), default="")
    related_url: Mapped[str] = mapped_column(String(2000), default="")
    status: Mapped[str] = mapped_column(String(20), default="DRAFT", index=True)
    version: Mapped[int] = mapped_column(default=1)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (CheckConstraint("ends_at >= starts_at", name="event_dates"),
        CheckConstraint("status IN ('DRAFT','PUBLISHED','UNPUBLISHED')", name="event_status"))


class EventStaffRow(Base):
    __tablename__ = "event_staff"
    event_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.public_events.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"), primary_key=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class FormRow(Base):
    __tablename__ = "registration_forms"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    event_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.public_events.id"), unique=True)
    draft_schema: Mapped[dict] = mapped_column(JSONB)
    published_version_id: Mapped[str | None] = mapped_column(ForeignKey("erp_ukm.registration_form_versions.id", use_alter=True, name="fk_form_active_version"))
    accepting: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(default=1)


class FormVersionRow(Base):
    __tablename__ = "registration_form_versions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    form_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.registration_forms.id"), index=True)
    number: Mapped[int] = mapped_column()
    schema: Mapped[dict] = mapped_column(JSONB)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint("id", "form_id"), UniqueConstraint("form_id", "number"))


class SubmissionRow(Base):
    __tablename__ = "registration_submissions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    form_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.registration_forms.id"), index=True)
    form_version_id: Mapped[str] = mapped_column(String(36), index=True)
    request_id: Mapped[str] = mapped_column(String(80))
    answers: Mapped[dict] = mapped_column(JSONB)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint("form_id", "request_id"),
        ForeignKeyConstraint(["form_version_id", "form_id"], ["erp_ukm.registration_form_versions.id", "erp_ukm.registration_form_versions.form_id"], name="fk_submission_version_form"))


class ShortLinkRow(Base):
    __tablename__ = "short_links"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    period_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.periods.id"), index=True)
    owner_user_id: Mapped[str] = mapped_column(ForeignKey("erp_ukm.users.id"), index=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    destination_url: Mapped[str] = mapped_column(String(2000))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(default=1)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PublicAttemptRow(Base):
    __tablename__ = "public_submission_attempts"
    key_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    attempts: Mapped[int] = mapped_column(default=0)
    window_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
