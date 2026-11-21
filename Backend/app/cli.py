"""Explicit bootstrap entrypoint; passwords are prompted and never logged."""

import argparse
from getpass import getpass

from sqlalchemy import func, select, text

from app.auth.service import passwords
from app.db import Database
from app.organization.models import BoardMembershipRow, MemberRow, PeriodRow, PositionRow, UserRow
from app.organization.service import seed_units
from app.permissions.policy import Position
from app.runtime import settings


def bootstrap(database: Database, *, username: str, password: str, name: str, period_name: str):
    import re
    if not re.fullmatch(r"[a-z0-9_.-]{1,80}", username) or not name.strip() or not period_name.strip():
        raise ValueError("Valid username, display name and period name required")
    if not 12 <= len(password) <= 256:
        raise ValueError("Password must contain 12–256 characters")
    with database.transaction() as session:
        session.execute(text("SELECT pg_advisory_xact_lock(827190613)"))
        if session.scalar(select(func.count()).select_from(UserRow)):
            raise ValueError("Bootstrap refused: ERP already has users")
        member = MemberRow(display_name=name.strip())
        session.add(member)
        session.flush()
        user = UserRow(member_id=member.id, username=username, password_hash=passwords.hash(password))
        period = PeriodRow(name=period_name.strip())
        session.add_all([user, period])
        session.flush()
        seed_units(session, period.id)
        session.add_all([BoardMembershipRow(user_id=user.id, period_id=period.id),
                         PositionRow(user_id=user.id, period_id=period.id, position=Position.CHAIR.value)])
        return user.id, period.id


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["bootstrap"])
    args = parser.parse_args()
    username = input("Username: ").strip()
    name = input("Nama pengurus: ").strip()
    period = input("Periode: ").strip()
    password = getpass("Password (minimal 12 karakter): ")
    if password != getpass("Ulangi password: "):
        raise SystemExit("Password tidak sama.")
    database = Database(settings())
    try:
        bootstrap(database, username=username, password=password, name=name, period_name=period)
        print("Bootstrap selesai. Akun Ketua Umum dan struktur periode tersedia.")
    finally:
        database.close()
