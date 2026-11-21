"""Real Chromium -> Next.js -> FastAPI -> approved PostgreSQL rollback test.

Credentials stay in process memory and travel to the browser driver on stdin.
All ERP fixture writes are isolated in one outer transaction and rolled back.
"""

from dataclasses import replace
import json
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
from threading import Thread
import time
from urllib.request import urlopen

import uvicorn

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
sys.path.insert(0, str(root / "tests"))
os.chdir(root)
os.environ["ERP_INTEGRATION_TEST"] = "1"

from test_postgres_api import PostgresApiTest


def process_memory(pid):
    try:
        values = {}
        for line in Path(f"/proc/{pid}/smaps_rollup").read_text().splitlines():
            if line.startswith(("Rss:", "Pss:")):
                key, value, _ = line.split()
                values[key.rstrip(":").lower() + "_kib"] = int(value)
        return values
    except (FileNotFoundError, PermissionError):
        return {"measurement": "unavailable"}


if __name__ == "__main__":
    PostgresApiTest.setUpClass()
    fixture = PostgresApiTest("test_auth_cookie_me_logout_and_csrf")
    fixture.setUp()
    p1 = "--p1" in sys.argv
    media = TemporaryDirectory(prefix="webuft-browser-media-")
    fixture.app.state.media_dir = media.name
    if p1:
        from app.organization.models import UnitMembershipRow
        with fixture.test_database.transaction() as session:
            session.add(UnitMembershipRow(user_id=fixture.root["id"], unit_id=fixture.units["Departemen Asset dan Property"]))
    else:
        fixture.seed_directory_accounts()
    origin = "http://127.0.0.1:3100"
    fixture.app.state.settings = replace(fixture.settings, public_origin=origin)
    server = uvicorn.Server(uvicorn.Config(fixture.app, host="127.0.0.1", port=8100,
                                           log_level="error", access_log=False))
    thread = Thread(target=server.run, daemon=True)
    thread.start()
    frontend = None
    try:
        deadline = time.monotonic() + 30
        while not server.started:
            if not thread.is_alive() or time.monotonic() > deadline:
                raise RuntimeError("Owned API test server failed to start")
            time.sleep(0.1)
        frontend_dir = root.parent / "frontend"
        production = "--production" in sys.argv
        distribution = ".next-erp-qa-prod" if production else ".next-erp-qa"
        qa_config = {"extends": "./tsconfig.json", "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "**/*.mts",
            distribution + "/types/**/*.ts", distribution + "/dev/types/**/*.ts"], "exclude": ["node_modules"]}
        (frontend_dir / "tsconfig.erp-qa.json").write_text(json.dumps(qa_config, indent=2) + "\n")
        frontend_environment = {**os.environ, "ERP_BACKEND_ORIGIN": "http://127.0.0.1:8100",
            "ERP_NEXT_DIST_DIR": distribution, "ERP_TS_CONFIG_PATH": "tsconfig.erp-qa.json"}
        if production:
            build = subprocess.run(["node", "node_modules/next/dist/bin/next", "build"], cwd=frontend_dir,
                                   env=frontend_environment, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            if build.returncode:
                raise RuntimeError("Production QA build failed; inspect the build separately")
        frontend = subprocess.Popen(["node", "node_modules/next/dist/bin/next", "start" if production else "dev", "--hostname", "127.0.0.1", "--port", "3100"],
            cwd=frontend_dir, env=frontend_environment,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        deadline = time.monotonic() + 60
        while True:
            if frontend.poll() is not None:
                raise RuntimeError("Owned Next.js test server failed to start")
            try:
                with urlopen(origin + "/admin/login", timeout=2) as response:
                    if response.status == 200:
                        break
            except Exception:
                if time.monotonic() > deadline:
                    raise RuntimeError("Owned Next.js test server readiness timed out") from None
                time.sleep(0.25)
        payload = {"origin": origin, "root": fixture.root, "chair": fixture.chair,
                   "external": fixture.external, "password": fixture.password,
                   "period_id": fixture.period_id, "units": fixture.units}
        result = subprocess.run(["node", "tests/erp-p1-browser.cjs" if p1 else "tests/erp-browser.cjs"], cwd=frontend_dir,
                                input=json.dumps(payload), text=True)
        if result.returncode:
            raise SystemExit(result.returncode)
        print(json.dumps({"runtime": "Next production" if production else "Next development",
            "next_server_memory": process_memory(frontend.pid), "python_fixture_api_memory": process_memory(os.getpid()),
            "measurement_limit": "Local warm sample with test harness, not peak load or target VPS capacity"}))
    finally:
        if frontend is not None:
            frontend.terminate()
            try:
                frontend.wait(timeout=10)
            except subprocess.TimeoutExpired:
                frontend.kill()
                frontend.wait()
        server.should_exit = True
        thread.join(timeout=10)
        fixture.tearDown()
        PostgresApiTest.tearDownClass()
        media.cleanup()
