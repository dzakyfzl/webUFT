"""Verify archive locking using two PostgreSQL transactions and one owned row.

Requires separate approval: briefly commits one synthetic period (no accounts),
then deletes only that UUID/name in finally. Never changes an existing period.
"""

from datetime import datetime, timezone
from pathlib import Path
import secrets
import sys
from threading import Event, Thread
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, select, text

from app.db import Database, lock_period
from app.errors import ApiError
from app.organization.models import PeriodRow, identifier
from app.runtime import settings


if __name__ == "__main__":
    database = Database(settings())
    row_id, name = identifier(), "Lock test " + secrets.token_hex(16)
    locked, release, started = Event(), Event(), Event()
    results = {}
    try:
        with database.transaction() as session:
            session.add(PeriodRow(id=row_id, name=name))

        def archive():
            try:
                with database.transaction() as session:
                    row = lock_period(session, row_id)
                    locked.set()
                    if not release.wait(10):
                        raise RuntimeError("Archive release timed out")
                    row.archived_at = datetime.now(timezone.utc)
                results["archive"] = "committed"
            except Exception:
                results["archive"] = "failed"
                locked.set()

        def mutate():
            try:
                with database.transaction() as session:
                    session.execute(text("SET LOCAL statement_timeout = '8s'"))
                    session.execute(text("SELECT set_config('application_name', :name, true)"), {"name": name})
                    started.set()
                    row = lock_period(session, row_id)
                    row.name = "This mutation must not commit"
                results["mutation"] = "unexpected_commit"
            except ApiError as error:
                results["mutation"] = error.code
            except Exception:
                results["mutation"] = "failed"

        writer = Thread(target=archive)
        writer.start()
        if not locked.wait(5) or results.get("archive") == "failed":
            raise RuntimeError("Archive lock could not be acquired")
        contender = Thread(target=mutate)
        contender.start()
        if not started.wait(5):
            raise RuntimeError("Contender did not start")
        observed_wait = False
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            with database.transaction() as session:
                observed_wait = bool(session.scalar(text(
                    "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name=:name AND wait_event_type='Lock')"),
                    {"name": name}))
            if observed_wait:
                break
            time.sleep(0.05)
        release.set()
        writer.join(10)
        contender.join(10)
        assert observed_wait, "PostgreSQL lock wait was not observed"
        assert results == {"archive": "committed", "mutation": "archived"}, results
        with database.transaction() as session:
            row = session.get(PeriodRow, row_id)
            assert row.name == name and row.archived_at is not None
        print("PASS: real PostgreSQL lock wait observed; mutation rejected after archive commit.")
    finally:
        release.set()
        for thread in (locals().get("writer"), locals().get("contender")):
            if thread:
                thread.join(10)
        with database.transaction() as session:
            session.execute(delete(PeriodRow).where(PeriodRow.id == row_id,
                PeriodRow.name.in_([name, "This mutation must not commit"])))
        database.close()
