"""Measure local read latency on a declared rollback-only PostgreSQL dataset."""

from datetime import date, timedelta
import json
import os
from pathlib import Path
import resource
import statistics
import sys
from time import perf_counter

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
sys.path.insert(0, str(root / "tests"))
os.chdir(root)
os.environ["ERP_INTEGRATION_TEST"] = "1"

from sqlalchemy import insert, text
from app.work.models import TaskRow
from test_postgres_api import PostgresApiTest


if __name__ == "__main__":
    PostgresApiTest.setUpClass()
    fixture = PostgresApiTest("test_auth_cookie_me_logout_and_csrf")
    fixture.setUp()
    try:
        program = fixture.create_program()
        rows = []
        for index in range(2000):
            scope = ("ORGANIZATION", "DEPARTMENT", "DIVISION", "PROGRAM")[index % 4]
            rows.append({"period_id": fixture.period_id, "scope_type": scope,
                "unit_id": fixture.units["Departemen Internal"] if scope == "DEPARTMENT" else fixture.units["Hunting"] if scope == "DIVISION" else None,
                "program_id": program["id"] if scope == "PROGRAM" else None,
                "title": f"Synthetic task {index}", "description": "", "status": ("TODO", "IN_PROGRESS", "DONE")[index % 3],
                "deadline": date.today() + timedelta(days=index % 60), "created_by": fixture.root["id"],
                "assignee_user_id": fixture.root["id"] if index % 5 == 0 else None})
        with fixture.test_database.transaction() as session:
            session.execute(insert(TaskRow), rows)
        measures = {}
        for path in ("/api/admin/tasks", "/api/admin/dashboard", "/api/admin/monitoring/units"):
            samples = []
            for index in range(26):
                started = perf_counter()
                response = fixture.client.get(path, params={"period_id": fixture.period_id})
                elapsed = (perf_counter() - started) * 1000
                if response.status_code != 200:
                    raise RuntimeError("Profile request failed; no response data printed")
                if index:
                    samples.append(elapsed)
            measures[path] = {"samples": len(samples), "p50_ms": round(statistics.median(samples), 2),
                              "p95_ms": round(sorted(samples)[23], 2)}
        with fixture.test_database.transaction() as session:
            buffers = session.scalar(text("SHOW shared_buffers"))
        print(json.dumps({"environment": "local TestClient + real PostgreSQL, serial read requests",
            "dataset": {"users": 4, "programs": 1, "tasks": 2000}, "latency": measures,
            "python_fixture_peak_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
            "postgres_shared_buffers_setting": buffers,
            "limits": ["Not a production VPS benchmark", "Includes test harness memory", "No concurrent load or write benchmark"]}, indent=2))
    finally:
        fixture.tearDown()
        PostgresApiTest.tearDownClass()
