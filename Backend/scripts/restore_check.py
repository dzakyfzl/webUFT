"""Restore a local backup to one temporary PostgreSQL database, then remove it.

Requires separate approval for CREATE/DROP DATABASE. Runtime target remains the
existing .env database. The script compares row counts without printing data.
"""

import os
from pathlib import Path
import secrets
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg
from psycopg import sql
from sqlalchemy.engine import make_url

from app.runtime import settings


if __name__ == "__main__":
    if len(sys.argv) != 2 or not Path(sys.argv[1]).is_file():
        raise SystemExit("Provide the owner-only backup path as the only argument")
    url = make_url(settings().database_url)
    parameters = dict(host=url.host, port=url.port or 5432, user=url.username,
                      password=url.password, dbname=url.database, connect_timeout=5)
    temporary_name = "webuft_restore_" + secrets.token_hex(12)
    created = False
    with psycopg.connect(**parameters, autocommit=True) as source:
        try:
            allowed = source.execute("SELECT rolcreatedb OR rolsuper FROM pg_roles WHERE rolname=current_user").fetchone()[0]
            if not allowed:
                raise SystemExit("Configured PostgreSQL role cannot create a restore-check database")
            source.execute(sql.SQL("CREATE DATABASE {} TEMPLATE template0").format(sql.Identifier(temporary_name)))
            created = True
            source.execute(sql.SQL("REVOKE CONNECT ON DATABASE {} FROM PUBLIC").format(sql.Identifier(temporary_name)))
            environment = {**os.environ, "PGHOST": url.host or "", "PGPORT": str(url.port or 5432),
                           "PGUSER": url.username or "", "PGPASSWORD": url.password or "", "PGDATABASE": temporary_name}
            result = subprocess.run(["pg_restore", "--exit-on-error", "--no-owner", "--no-acl", "--dbname", temporary_name, sys.argv[1]],
                                    env=environment, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            if result.returncode:
                raise SystemExit("Restore check failed; potentially sensitive server details suppressed")
            with psycopg.connect(**{**parameters, "dbname": temporary_name}) as restored:
                tables = restored.execute("SELECT table_schema, table_name FROM information_schema.tables "
                    "WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2").fetchall()
                checked = 0
                total_rows = 0
                for schema, table in tables:
                    query = sql.SQL("SELECT count(*) FROM {}.{}").format(sql.Identifier(schema), sql.Identifier(table))
                    restored_count = restored.execute(query).fetchone()[0]
                    source_count = source.execute(query).fetchone()[0]
                    if restored_count != source_count:
                        raise SystemExit("Restore row-count comparison differs from source; no table data printed")
                    checked += 1
                    total_rows += restored_count
                print(f"PASS: backup restored into a separate temporary PostgreSQL database; {checked} table counts matched ({total_rows} rows).")
        finally:
            if created:
                source.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(temporary_name)))
                print("Temporary restore database removed; runtime target unchanged.")
