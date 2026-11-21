"""Interactive local UAT on the approved PostgreSQL target, with outer rollback.

No migrations, persistent users or substitute database.
"""

import argparse
from contextlib import ExitStack
from dataclasses import replace
from getpass import getpass
import json
import os
from pathlib import Path
import secrets
import signal
import socket
import subprocess
import sys
from tempfile import TemporaryDirectory
from threading import Thread
import time
import traceback
from urllib.request import urlopen

import uvicorn
from sqlalchemy import func, select
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]
LOCAL_PASSWORD_FILE = ROOT / "scripts" / ".uat-password"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tests"))

from app.db import Base, Database
from app.organization.models import MemberRow, PeriodRow, UserRow
from app.permissions.policy import Position
from app.runtime import settings
import test_postgres_api as p0


class UatError(RuntimeError):
    """Operator-facing messages written here must never contain sensitive values."""


def session_password(check):
    if check:
        return secrets.token_urlsafe(24)
    try:
        password = LOCAL_PASSWORD_FILE.read_text(encoding="utf-8").rstrip("\n")
        from_prompt = False
    except FileNotFoundError:
        password = getpass("Password sesi UAT (12–256 karakter): ")
        from_prompt = True
    if not 12 <= len(password) <= 256:
        raise UatError("Password harus berisi 12–256 karakter.")
    if from_prompt and password != getpass("Ulangi password sesi: "):
        raise UatError("Password tidak sama.")
    return password


def row_counts(database):
    with database.transaction() as session:
        return {table.name: session.scalar(select(func.count()).select_from(table))
                for table in Base.metadata.sorted_tables}


def stop_process(process):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


def wait_for(url, process):
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Next UAT berhenti sebelum siap.")
        try:
            with urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return
        except OSError:
            pass
        time.sleep(0.2)
    raise RuntimeError("Batas waktu startup Next UAT terlewati.")


def seed(fixture):
    roles = {"ketua": fixture.root, "hunting": fixture.hunting,
             "eksternal": fixture.external, "ketupel_a": fixture.chair,
             "wakil": fixture.make_user("uat-wakil", position=Position.VICE_CHAIR),
             "aset": fixture.make_user("uat-aset", unit="Departemen Asset dan Property"),
             "ketupel_b": fixture.make_user("uat-ketupel-b"),
             "biasa": fixture.make_user("uat-biasa")}
    with fixture.test_database.transaction() as session:
        session.get(PeriodRow, fixture.period_id).name = "UAT lokal sementara"
        for role, person in roles.items():
            user = session.get(UserRow, person["id"])
            user.username = "uat-" + role.replace("_", "-")
            person["username"] = user.username
            session.get(MemberRow, user.member_id).display_name = "UAT " + role.replace("_", " ")
    fixture.sign_in(fixture.root)
    first = fixture.create_program(name="UAT Proker A", chairperson_name="UAT Ketupel A")
    second = fixture.create_program(name="UAT Proker B", chairperson_name="UAT Ketupel B",
                                    chairperson_user_id=roles["ketupel_b"]["id"])
    for index in range(3):
        fixture.create_task(title=f"UAT tugas belum selesai {index + 1}", scope_type="PROGRAM",
                            scope_id=first["id"], assignee_user_id=fixture.chair["id"])
    fixture.create_task(title="UAT tugas Umum")
    fixture.sign_in(fixture.external)
    fixture.create_task(title="UAT tugas Eksternal", scope_type="DEPARTMENT",
                        scope_id=fixture.units["Departemen Eksternal"])
    fixture.sign_in(fixture.root)
    return {"roles": roles, "period_id": fixture.period_id,
            "program_a": first["id"], "program_b": second["id"]}


def run(args):
    config = settings()
    if config.environment == "production" or make_url(config.database_url).host not in ("localhost", "127.0.0.1", "::1"):
        raise UatError("UAT hanya diizinkan pada target PostgreSQL loopback non-production.")
    origin = "http://localhost:3200"
    config = replace(config, environment="test", public_origin=origin)
    frontend_dir = ROOT.parent / "frontend"
    next_bin = frontend_dir / "node_modules/next/dist/bin/next"
    if not next_bin.is_file():
        raise UatError("Dependensi frontend belum tersedia; ikuti RUNBOOK.md.")
    with ExitStack() as stack:
        # Fail before fixture writes or starting services when either port is busy.
        for port in ((8200, 3200, 9328) if args.check else (8200, 3200)):
            with socket.socket() as probe:
                probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                try:
                    probe.bind(("127.0.0.1", port))
                except OSError as error:
                    raise UatError(f"Port lokal {port} tidak dapat dipakai untuk UAT (errno {error.errno}).") from None
        database = Database(config)
        stack.callback(database.close)
        before = row_counts(database)
        if any(count for table, count in before.items() if table != "login_attempts"):
            raise UatError("UAT ditolak: data ERP sudah ada. Gunakan prosedur UAT operasional terpisah.")
        def verify_rollback():
            if row_counts(database) != before:
                raise RuntimeError("Jumlah baris ERP berubah di luar sesi UAT.")
            print("Rollback terverifikasi: seluruh tabel ERP kembali ke jumlah awal.", flush=True)
        stack.callback(verify_rollback)
        password = session_password(args.check)
        # Reuse the approved serialized savepoint fixture and its real API helpers.
        fixture = p0.PostgresApiTest("test_auth_cookie_me_logout_and_csrf")
        fixture.settings, fixture.database = config, database
        fixture.setUp()
        stack.callback(fixture.tearDown)
        # Replace the fixture's initial hashes before creating the remaining UAT accounts.
        from app.auth.service import passwords
        fixture.password = password
        password_hash = passwords.hash(password)
        with fixture.test_database.transaction() as session:
            fixture_ids = [fixture.root["id"], fixture.hunting["id"], fixture.external["id"], fixture.chair["id"]]
            for user in session.scalars(select(UserRow).where(UserRow.id.in_(fixture_ids))):
                user.password_hash = password_hash
        media = TemporaryDirectory(prefix="webuft-uat-media-")
        def verify_media_removed():
            if Path(media.name).exists():
                raise RuntimeError("Media sementara UAT belum dibersihkan.")
            print("Media sementara UAT dibersihkan.", flush=True)
        stack.callback(verify_media_removed)
        fixture.app.state.media_dir = stack.enter_context(media)
        payload = {"origin": origin, "password": password, **seed(fixture)}
        server = uvicorn.Server(uvicorn.Config(fixture.app, host="127.0.0.1", port=8200,
            log_level="error", access_log=False, timeout_graceful_shutdown=5))
        thread = Thread(target=server.run, daemon=True)
        def stop_api():
            server.should_exit = True
            thread.join(timeout=10)
            if thread.is_alive():
                raise RuntimeError("API UAT belum berhenti; jangan gunakan kembali koneksi fixture.")
        thread.start()
        stack.callback(stop_api)
        deadline = time.monotonic() + 20
        while not server.started:
            if not thread.is_alive() or time.monotonic() >= deadline:
                raise RuntimeError("API UAT gagal mulai.")
            time.sleep(0.1)
        # Separate dist and TS configuration from regular development/browser QA.
        ts_config = {"extends": "./tsconfig.json", "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx",
            "**/*.mts", ".next-erp-uat/types/**/*.ts", ".next-erp-uat/dev/types/**/*.ts"], "exclude": ["node_modules"]}
        (frontend_dir / "tsconfig.erp-uat.json").write_text(json.dumps(ts_config, indent=2) + "\n")
        frontend = subprocess.Popen(["node", str(next_bin), "dev", "--hostname", "127.0.0.1", "--port", "3200"],
            cwd=frontend_dir, env={**os.environ, "ERP_BACKEND_ORIGIN": "http://127.0.0.1:8200",
                "ERP_NEXT_DIST_DIR": ".next-erp-uat", "ERP_TS_CONFIG_PATH": "tsconfig.erp-uat.json"},
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        stack.callback(stop_process, frontend)
        wait_for(origin + "/api/ready", frontend)
        wait_for(origin + "/admin/login", frontend)
        if args.check:
            result = subprocess.run(["node", "tests/erp-uat-browser.cjs"], cwd=frontend_dir,
                input=json.dumps(payload), text=True, timeout=240)
            if result.returncode:
                raise RuntimeError("Pemeriksaan browser UAT gagal.")
        else:
            print(f"UAT siap: {origin}/admin/login", flush=True)
            print("Akun: " + ", ".join(person["username"] for person in payload["roles"].values()), flush=True)
            print("Semua akun memakai password sesi yang sama. Gunakan profil browser terpisah tiap peran.", flush=True)
            print("Checklist: Docs/implementation/UAT.md. Ctrl+C mengakhiri sesi dan rollback seluruh data uji.", flush=True)
            while thread.is_alive() and frontend.poll() is None:
                time.sleep(0.5)
            raise RuntimeError("Salah satu service UAT berhenti.")
    print("UAT check lulus.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Uji browser dan rollback, lalu keluar tanpa prompt password")
    args = parser.parse_args()
    def interrupted(signum, frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, interrupted)
    try:
        run(args)
    except KeyboardInterrupt:
        print("Sesi UAT dihentikan; transaksi fixture di-rollback dan media sementara dibersihkan.")
    except UatError as error:
        print(str(error), file=sys.stderr)
        return 1
    except Exception as error:
        # Never print driver exceptions, request payloads or connection strings.
        locations = " -> ".join(f"{Path(frame.filename).name}:{frame.lineno}" for frame in traceback.extract_tb(error.__traceback__)[-3:])
        print(f"UAT gagal ({type(error).__name__}; {locations}). Periksa port, dependensi dan preflight; rincian sensitif disembunyikan.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
