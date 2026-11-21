"""Read-only PostgreSQL target inspection; never prints connection credentials."""

import json
import os
from pathlib import Path
import subprocess


def environment(path: Path):
    values = {}
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip('"').strip("'")
    return {**values, **os.environ}


if __name__ == "__main__":
    values = environment(Path(__file__).resolve().parents[2] / ".env")
    connection = {"PGHOST": values.get("DATABASE_HOST", ""),
                  "PGPORT": values.get("DATABASE_PORT", "5432"),
                  "PGUSER": values.get("DATABASE_USERNAME", ""),
                  "PGPASSWORD": values.get("DATABASE_PASSWORD", ""),
                  "PGDATABASE": values.get("DATABASE_DATABASE", ""),
                  "PGCONNECT_TIMEOUT": "5",
                  "PGOPTIONS": "-c default_transaction_read_only=on -c statement_timeout=5000"}
    if not all(connection[k] for k in ("PGHOST", "PGUSER", "PGDATABASE")):
        raise SystemExit("Preflight requires the existing DATABASE_* settings; no fallback target.")
    query = """SELECT json_build_object(
        'postgresql_version', current_setting('server_version'),
        'read_only', current_setting('transaction_read_only'),
        'can_create_schema', has_database_privilege(current_user, current_database(), 'CREATE'),
        'erp_schema_exists', EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='erp_ukm'),
        'erp_table_count', (SELECT count(*) FROM information_schema.tables WHERE table_schema='erp_ukm'),
        'other_table_count', (SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema','erp_ukm'))
    )"""
    result = subprocess.run(["psql", "-X", "-w", "-t", "-A", "-c", query],
                            env={**os.environ, **connection}, text=True, capture_output=True)
    if result.returncode:
        raise SystemExit("PostgreSQL preflight failed; connection details suppressed.")
    summary = json.loads(result.stdout)
    if summary["erp_schema_exists"]:
        row_counts = """SELECT json_build_object(
            'users', (SELECT count(*) FROM erp_ukm.users),
            'periods', (SELECT count(*) FROM erp_ukm.periods),
            'programs', (SELECT count(*) FROM erp_ukm.programs),
            'tasks', (SELECT count(*) FROM erp_ukm.tasks),
            'audit_events', (SELECT count(*) FROM erp_ukm.audit_events))"""
        result = subprocess.run(["psql", "-X", "-w", "-t", "-A", "-c", row_counts],
                                env={**os.environ, **connection}, text=True, capture_output=True)
        if result.returncode:
            raise SystemExit("PostgreSQL row-count preflight failed; connection details suppressed.")
        summary["erp_row_counts"] = json.loads(result.stdout)
        if summary["erp_table_count"] >= 30:
            p1_tables = ("attachments", "expenses", "program_reports", "physical_assets", "asset_loans",
                         "digital_assets", "public_events", "event_staff", "registration_forms",
                         "registration_form_versions", "registration_submissions", "short_links", "public_submission_attempts")
            query = "SELECT json_build_object(" + ", ".join(
                f"'{name}', (SELECT count(*) FROM erp_ukm.{name})" for name in p1_tables) + ")"
            result = subprocess.run(["psql", "-X", "-w", "-t", "-A", "-c", query],
                env={**os.environ, **connection}, text=True, capture_output=True)
            if result.returncode:
                raise SystemExit("P1 preflight failed; connection details suppressed.")
            summary["p1_row_counts"] = json.loads(result.stdout)
    summary["target_is_loopback"] = connection["PGHOST"] in ("localhost", "127.0.0.1", "::1")
    print(json.dumps(summary, indent=2))
