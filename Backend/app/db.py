"""One PostgreSQL unit of work. No SQLite or automatic schema creation."""

from contextlib import contextmanager

from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import Settings


SCHEMA = "erp_ukm"


class Base(DeclarativeBase):
    metadata = MetaData(schema=SCHEMA, naming_convention={
        "ix": "ix_%(table_name)s_%(column_0_name)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    })


def make_engine(settings: Settings):
    return create_engine(settings.database_url, pool_pre_ping=True,
                         pool_size=settings.pool_size, max_overflow=settings.pool_max_overflow,
                         hide_parameters=True, connect_args={"connect_timeout": 5})


class Database:
    def __init__(self, settings: Settings):
        self.engine = make_engine(settings)
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)

    @contextmanager
    def transaction(self):
        with self.sessions() as session, session.begin():
            yield session

    def close(self):
        self.engine.dispose()


def lock_period(session: Session, period_id: str):
    from app.organization.models import PeriodRow
    from app.errors import ApiError
    row = session.get(PeriodRow, period_id, with_for_update=True)
    if row is None:
        raise ApiError(404, "not_found", "Periode tidak ditemukan.")
    if row.archived_at is not None:
        raise ApiError(409, "archived", "Periode sudah diarsipkan dan hanya dapat dibaca.")
    return row
