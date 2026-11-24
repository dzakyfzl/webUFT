"""Opt-in tests against the approved target; every fixture is rolled back.

No SQLite, substitute database, CREATE/DROP, persistent users or legacy writes.
Run only after the approved baseline exists: ERP_INTEGRATION_TEST=1 ... unittest.
"""

from contextlib import contextmanager
from threading import Lock
from datetime import datetime, timezone
import os
import secrets
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import event, func, insert, select
from sqlalchemy.orm import sessionmaker

from app.audit import AuditRow
from app.auth.models import LoginAttemptRow
from app.auth.service import passwords
from app.db import Database
from app.main import create_app
from app.organization.models import (BoardMembershipRow, MemberRow, PeriodRow,
    PositionRow, UnitMembershipRow, UserRow, identifier)
from app.organization.service import seed_units
from app.permissions.policy import Position
from app.programs.models import GrantRow, ProgramRow
from app.runtime import settings
from app.work.models import TaskRow


class RollbackDatabase:
    def __init__(self, connection):
        # FastAPI may enter and exit a sync dependency on different workers.
        # A primitive lock serializes this single test connection across them.
        self.lock = Lock()
        self.sessions = sessionmaker(bind=connection, expire_on_commit=False,
                                    join_transaction_mode="create_savepoint")

    @contextmanager
    def transaction(self):
        with self.lock, self.sessions() as session, session.begin():
            yield session


@unittest.skipUnless(os.getenv("ERP_INTEGRATION_TEST") == "1", "approved PostgreSQL test is opt-in")
class PostgresApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.settings = settings()
        cls.database = Database(cls.settings)

    @classmethod
    def tearDownClass(cls):
        cls.database.close()

    def setUp(self):
        self.constraint_errors = []
        def capture_constraint(context):
            diagnostic = getattr(context.original_exception, "diag", None)
            self.constraint_errors.append(getattr(diagnostic, "constraint_name", None))
        self.capture_constraint = capture_constraint
        event.listen(self.database.engine, "handle_error", capture_constraint)
        self.connection = self.database.engine.connect()
        self.outer_transaction = self.connection.begin()
        self.test_database = RollbackDatabase(self.connection)
        self.password = secrets.token_urlsafe(24)
        with self.test_database.transaction() as session:
            period = PeriodRow(name="Test-" + secrets.token_hex(8))
            session.add(period)
            session.flush()
            self.period_id = period.id
            self.units = {name: row.id for name, row in seed_units(session, period.id).items()}
        self.root = self.make_user("root", position=Position.CHAIR)
        self.hunting = self.make_user("hunting", unit="Hunting")
        self.external = self.make_user("external", unit="Departemen Eksternal")
        self.chair = self.make_user("chair")
        self.app = create_app(self.settings)
        self.app.state.database = self.test_database
        self.context = TestClient(self.app)
        self.client = self.context.__enter__()
        self.sign_in(self.root)

    def tearDown(self):
        self.context.__exit__(None, None, None)
        self.outer_transaction.rollback()
        self.connection.close()
        event.remove(self.database.engine, "handle_error", self.capture_constraint)

    def make_user(self, name, *, position=None, unit=None):
        with self.test_database.transaction() as session:
            member = MemberRow(display_name="Test " + name)
            session.add(member)
            session.flush()
            row = UserRow(member_id=member.id, username="test-" + name + "-" + secrets.token_hex(5),
                          password_hash=passwords.hash(self.password))
            session.add(row)
            session.flush()
            session.add(BoardMembershipRow(user_id=row.id, period_id=self.period_id))
            if position:
                session.add(PositionRow(user_id=row.id, period_id=self.period_id, position=position.value))
            if unit:
                session.add(UnitMembershipRow(user_id=row.id, unit_id=self.units[unit]))
            return {"id": row.id, "username": row.username}

    def sign_in(self, person):
        self.client.cookies.clear()
        response = self.client.post("/api/admin/auth/login", headers={"Origin": self.settings.public_origin},
                                    json={"username": person["username"], "password": self.password})
        self.assertEqual(response.status_code, 200, response.text)
        self.client.headers.update({"Origin": self.settings.public_origin,
                                    "X-CSRF-Token": response.json()["csrf_token"]})
        return response

    def create_program(self, **changes):
        body = {"period_id": self.period_id, "owner_unit_id": self.units["Departemen Internal"],
                "name": "Test Proker", "description": "Synthetic integration fixture",
                "chairperson_name": "Test Ketua", "chairperson_user_id": self.chair["id"]}
        body.update(changes)
        response = self.client.post("/api/admin/programs", json=body)
        self.assertEqual(response.status_code, 201, response.text + str(self.constraint_errors))
        return response.json()

    def create_task(self, **changes):
        body = {"period_id": self.period_id, "scope_type": "ORGANIZATION", "title": "Test task"}
        body.update(changes)
        response = self.client.post("/api/admin/tasks", json=body)
        self.assertEqual(response.status_code, 201, response.text + str(self.constraint_errors))
        return response.json()

    def seed_directory_accounts(self, count=501):
        accounts = []
        with self.test_database.transaction() as session:
            password_hash = session.get(UserRow, self.root["id"]).password_hash
            members, boards = [], []
            prefix = "zz-directory-" + secrets.token_hex(5)
            for index in range(count):
                member_id, user_id = identifier(), identifier()
                members.append({"id": member_id, "display_name": f"Directory fixture {index:04d}"})
                accounts.append({"id": user_id, "member_id": member_id, "username": f"{prefix}-{index:04d}",
                                 "password_hash": password_hash})
                boards.append({"user_id": user_id, "period_id": self.period_id})
            session.execute(insert(MemberRow), members)
            session.execute(insert(UserRow), accounts)
            session.execute(insert(BoardMembershipRow), boards)
        return accounts

    def test_existing_member_becomes_one_account_and_duplicate_is_rejected(self):
        member = self.client.post("/api/admin/members", json={"name": "Existing %_ member"})
        self.assertEqual(member.status_code, 201, member.text)
        member = member.json()
        body = {"username": "linked-" + secrets.token_hex(5), "password": self.password,
                "display_name": "Must not replace existing name", "member_id": member["id"], "period_id": self.period_id}
        response = self.client.post("/api/admin/users", json=body)
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["member_id"], member["id"])
        self.assertEqual(response.json()["display_name"], member["display_name"])
        duplicate = self.client.post("/api/admin/users", json={**body, "username": "other-" + secrets.token_hex(5)})
        self.assertEqual(duplicate.status_code, 409, duplicate.text)
        self.assertEqual(duplicate.json()["error"]["code"], "member_has_account")
        users = self.client.get("/api/admin/users", params={"search": "%_"}).json()["items"]
        self.assertEqual([row["id"] for row in users], [response.json()["id"]])
        self.assertEqual(self.client.get("/api/admin/members", params={"search": "%_", "without_account": True}).json()["items"], [])
        with self.test_database.transaction() as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(UserRow).where(UserRow.member_id == member["id"])), 1)
            self.assertEqual(session.scalar(select(func.count()).select_from(AuditRow).where(
                AuditRow.resource_id == response.json()["id"], AuditRow.action == "user.created")), 1)
        self.sign_in(self.hunting)
        self.assertEqual(self.client.get("/api/admin/members").status_code, 403)
        self.assertEqual(self.client.post("/api/admin/members", json={"name": "Forbidden"}).status_code, 403)

    def test_member_search_pages_are_stable_and_exclude_linked_accounts(self):
        with self.test_database.transaction() as session:
            session.execute(insert(MemberRow), [{"display_name": "Unlinked %_ fixture"} for _ in range(51)])
        params = {"search": "Unlinked %_", "without_account": True, "limit": 50}
        first = self.client.get("/api/admin/members", params=params).json()
        second = self.client.get("/api/admin/members", params={**params, "offset": 50}).json()
        self.assertEqual(len(first["items"]), 50)
        self.assertTrue(first["has_more"])
        self.assertEqual(len(second["items"]), 1)
        self.assertFalse(second["has_more"])
        self.assertEqual(len({row["id"] for row in first["items"] + second["items"]}), 51)

    def test_directory_can_reach_accounts_after_the_first_500(self):
        accounts = self.seed_directory_accounts()
        params = {"period_id": self.period_id, "limit": 500}
        first = self.client.get("/api/admin/directory", params=params)
        second = self.client.get("/api/admin/directory", params={**params, "offset": 500})
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200, second.text)
        first, second = first.json(), second.json()
        self.assertEqual(len(first["items"]), 500)
        self.assertTrue(first["has_more"])
        self.assertEqual(len(second["items"]), 5)
        self.assertFalse(second["has_more"])
        self.assertIn(accounts[-1]["id"], {row["id"] for row in second["items"]})
        self.assertEqual(len({row["id"] for row in first["items"] + second["items"]}), 505)

    def test_auth_cookie_me_logout_and_csrf(self):
        response = self.sign_in(self.root)
        cookie = response.headers["set-cookie"].lower()
        self.assertIn("httponly", cookie)
        self.assertIn("samesite=lax", cookie)
        me = self.client.get("/api/admin/me").json()
        self.assertEqual(me["user"]["id"], self.root["id"])
        self.assertTrue(me["capabilities"]["manage_organization"])
        response = self.client.post("/api/admin/auth/logout", headers={"X-CSRF-Token": "incorrect"})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.post("/api/admin/auth/logout").status_code, 204)
        self.assertEqual(self.client.get("/api/admin/me").status_code, 401)

    def test_deactivation_invalidates_an_existing_session(self):
        self.sign_in(self.hunting)
        with self.test_database.transaction() as session:
            session.get(UserRow, self.hunting["id"]).active = False
        self.assertEqual(self.client.get("/api/admin/me").status_code, 401)

    def test_all_twelve_inti_can_manage_users_non_inti_cannot(self):
        for position in Position:
            with self.subTest(position=position):
                with self.test_database.transaction() as session:
                    row = session.scalar(select(PositionRow).where(PositionRow.user_id == self.root["id"]))
                    row.position = position.value
                self.assertEqual(self.client.get("/api/admin/users").status_code, 200)
                self.assertEqual(self.client.patch(f'/api/admin/users/{self.external["id"]}',
                    json={"display_name": "Managed by " + position.value}).status_code, 200)
        self.sign_in(self.hunting)
        self.assertEqual(self.client.get("/api/admin/users").status_code, 403)

    def test_create_program_active_and_initial_grants_audited_atomically(self):
        program = self.create_program()
        self.assertEqual(program["status"], "ACTIVE")
        with self.test_database.transaction() as session:
            rows = session.scalars(select(GrantRow).where(GrantRow.program_id == program["id"])).all()
            self.assertEqual({row.user_id for row in rows}, {self.root["id"], self.chair["id"]})
            self.assertEqual(session.scalar(select(func.count()).select_from(AuditRow).where(
                AuditRow.resource_id == program["id"], AuditRow.action == "program.created")), 1)
        self.sign_in(self.external)
        detail = self.client.get("/api/admin/programs/" + program["id"])
        self.assertEqual(detail.status_code, 200)
        self.assertFalse(detail.json()["capabilities"]["edit"])
        response = self.client.patch("/api/admin/programs/" + program["id"], json={
            "expected_version": 1, "name": "Unauthorized", "description": ""})
        self.assertEqual(response.status_code, 403)

    def test_non_inti_cannot_create_program_via_api(self):
        self.sign_in(self.hunting)
        response = self.client.post("/api/admin/programs", json={"period_id": self.period_id,
            "owner_unit_id": self.units["Departemen Internal"], "name": "Denied", "chairperson_name": "Test"})
        self.assertEqual(response.status_code, 403)
        with self.test_database.transaction() as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(ProgramRow).where(
                ProgramRow.period_id == self.period_id)), 0)

    def test_two_chairpersons_only_customize_their_own_program(self):
        first = self.create_program()
        second = self.create_program(chairperson_user_id=self.external["id"])
        for person, own, other in ((self.chair, first, second), (self.external, second, first)):
            self.sign_in(person)
            path = f'/api/admin/programs/{own["id"]}/committee/template'
            response = self.client.post(path, json={"expected_version": 1})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertIn("PDD", {row["label"] for row in response.json()["groups"]})
            path = f'/api/admin/programs/{other["id"]}/committee/template'
            self.assertEqual(self.client.post(path, json={"expected_version": 1}).status_code, 403)

    def test_membership_inheritance_controls_manual_grants(self):
        program = self.create_program()
        path = f'/api/admin/programs/{program["id"]}/assignments'
        self.sign_in(self.hunting)
        self.assertEqual(self.client.post(path, json={"user_id": self.external["id"]}).status_code, 200)
        self.sign_in(self.external)
        detail = self.client.get(f'/api/admin/programs/{program["id"]}').json()
        self.assertTrue(detail["capabilities"]["edit"])
        self.assertFalse(detail["capabilities"]["assign"])
        self.assertEqual(self.client.post(path, json={"user_id": self.chair["id"]}).status_code, 403)

    def test_manual_grant_can_be_revoked_after_account_deactivation(self):
        program = self.create_program()
        path = f'/api/admin/programs/{program["id"]}/assignments'
        self.sign_in(self.hunting)
        self.assertEqual(self.client.post(path, json={"user_id": self.external["id"]}).status_code, 200)
        self.sign_in(self.root)
        self.assertEqual(self.client.patch(f'/api/admin/users/{self.external["id"]}', json={"active": False}).status_code, 200)
        self.sign_in(self.hunting)
        self.assertEqual(self.client.delete(path + "/" + self.external["id"]).status_code, 200)
        self.assertEqual(self.client.post(path, json={"user_id": self.external["id"]}).status_code, 422)
        self.assertEqual(self.client.get("/api/admin/me").status_code, 200)
        with self.test_database.transaction() as session:
            grant = session.scalar(select(GrantRow).where(GrantRow.program_id == program["id"],
                GrantRow.user_id == self.external["id"], GrantRow.source == "MANUAL"))
            self.assertFalse(grant.active)

    def test_chairperson_change_preserves_record_and_moves_grant(self):
        program = self.create_program()
        path = f'/api/admin/programs/{program["id"]}'
        response = self.client.put(path + "/chairperson", json={"expected_version": 1,
            "chairperson_user_id": self.external["id"], "chairperson_name": "Penerus"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["name"], program["name"])
        self.sign_in(self.chair)
        self.assertFalse(self.client.get(path).json()["capabilities"]["structure"])
        self.assertFalse(self.client.get(path).json()["capabilities"]["edit"])
        self.sign_in(self.external)
        self.assertTrue(self.client.get(path).json()["capabilities"]["structure"])

    def test_closed_program_mutations_denied_and_retry_does_not_duplicate_audit(self):
        program = self.create_program()
        path = f'/api/admin/programs/{program["id"]}'
        response = self.client.post(path + "/close", json={"expected_version": 1})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.post(path + "/close", json={"expected_version": 1}).status_code, 200)
        with self.test_database.transaction() as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(AuditRow).where(
                AuditRow.resource_id == program["id"], AuditRow.action == "program.closed")), 1)
        response = self.client.patch(path, json={"expected_version": 2, "name": "Cannot change"})
        self.assertEqual(response.status_code, 409)

    def test_validation_error_rolls_back_program_and_grants(self):
        before = self.client.get("/api/admin/programs", params={"period_id": self.period_id}).json()
        response = self.client.post("/api/admin/programs", json={"period_id": self.period_id,
            "owner_unit_id": self.units["Departemen Internal"], "name": "Invalid dates", "chairperson_name": "Test",
            "starts_on": "2026-12-02", "ends_on": "2026-12-01"})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.client.get("/api/admin/programs", params={"period_id": self.period_id}).json(), before)

    def test_committee_template_only_chair_and_nonaccount_member_has_no_grant(self):
        program = self.create_program()
        path = f'/api/admin/programs/{program["id"]}/committee'
        self.assertEqual(self.client.post(path + "/template", json={"expected_version": 1}).status_code, 403)
        self.sign_in(self.chair)
        response = self.client.post(path + "/template", json={"expected_version": 1})
        self.assertEqual(response.status_code, 200, response.text)
        groups = response.json()["groups"]
        self.assertIn("PDD", {group["label"] for group in groups})
        member = self.client.post(path + "/members", json={"expected_version": 2,
            "display_name": "Test Panitia Nonakun", "role": "Anggota", "group_id": groups[0]["id"]})
        self.assertEqual(member.status_code, 201, member.text)
        response = self.client.put(path + "/structure", json={"expected_version": 3, "groups": []})
        self.assertEqual(response.status_code, 409)
        with self.test_database.transaction() as session:
            grants = session.scalars(select(GrantRow).where(GrantRow.program_id == program["id"], GrantRow.active.is_(True))).all()
            self.assertEqual({grant.user_id for grant in grants}, {self.root["id"], self.chair["id"]})

    def test_budget_total_is_exact_server_value_and_closed_is_read_only(self):
        program = self.create_program()
        path = f'/api/admin/programs/{program["id"]}'
        response = self.client.post(path + "/budget", json={"name": "Kertas", "quantity": "2.5",
            "unit": "pak", "unit_price": "1000.2"})
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["total_rupiah"], "2501")
        line_id = response.json()["items"][0]["id"]
        self.assertEqual(self.client.post(path + "/close", json={"expected_version": 1}).status_code, 200)
        response = self.client.request("DELETE", path + "/budget/" + line_id, json={"expected_version": 1})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.client.get(path + "/budget").json()["total_rupiah"], "2501")

    def test_pic_grants_are_scoped_and_changing_pic_preserves_other_sources(self):
        program = self.create_program()
        task = self.create_task(scope_type="PROGRAM", scope_id=program["id"], assignee_user_id=self.external["id"])
        self.sign_in(self.external)
        self.assertTrue(self.client.get(f'/api/admin/programs/{program["id"]}').json()["capabilities"]["edit"])
        # Root creator may replace PIC; the former PIC has no other grant.
        self.sign_in(self.root)
        response = self.client.patch("/api/admin/tasks/" + task["id"], json={"expected_version": 1,
            "title": task["title"], "assignee_user_id": self.hunting["id"]})
        self.assertEqual(response.status_code, 200, response.text)
        self.sign_in(self.external)
        self.assertFalse(self.client.get(f'/api/admin/programs/{program["id"]}').json()["capabilities"]["edit"])
        self.sign_in(self.hunting)
        self.assertTrue(self.client.get(f'/api/admin/programs/{program["id"]}').json()["capabilities"]["edit"])

    def test_department_aggregate_keeps_original_program_permissions_and_no_duplicates(self):
        program = self.create_program()
        task = self.create_task(scope_type="PROGRAM", scope_id=program["id"])
        self.sign_in(self.hunting)
        response = self.client.get("/api/admin/tasks", params={"period_id": self.period_id,
            "scope_type": "DEPARTMENT", "scope_id": self.units["Departemen Internal"]})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual([row["id"] for row in response.json()["items"]], [task["id"]])
        self.assertFalse(response.json()["items"][0]["can_edit"])
        self.assertEqual(self.client.patch("/api/admin/tasks/" + task["id"],
            json={"expected_version": 1, "title": "Denied", "status": "DONE"}).status_code, 403)

    def test_close_with_unfinished_tasks_preserves_status_and_hides_calendar(self):
        program = self.create_program()
        tasks = [self.create_task(scope_type="PROGRAM", scope_id=program["id"], deadline="2026-12-01") for _ in range(3)]
        self.sign_in(self.chair)
        path = f'/api/admin/programs/{program["id"]}'
        self.assertEqual(self.client.post(path + "/close", json={"expected_version": 1}).status_code, 409)
        response = self.client.post(path + "/close", json={"expected_version": 1, "confirmed_unfinished": True})
        self.assertEqual(response.status_code, 200, response.text)
        for task in tasks:
            self.assertEqual(self.client.get("/api/admin/tasks/" + task["id"]).json()["status"], "TODO")
        response = self.client.get("/api/admin/calendar-events", params={"period_id": self.period_id,
            "start": "2026-12-01", "end": "2026-12-31"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["items"], [])

    def test_dashboard_only_focuses_assigned_work_and_other_programs_remain_searchable(self):
        mine = self.create_program(name="Assigned")
        other = self.create_program(name="Other", chairperson_user_id=self.root["id"])
        task = self.create_task(scope_type="PROGRAM", scope_id=mine["id"], assignee_user_id=self.chair["id"])
        self.create_task(scope_type="PROGRAM", scope_id=other["id"], assignee_user_id=self.root["id"])
        self.sign_in(self.chair)
        response = self.client.get("/api/admin/dashboard", params={"period_id": self.period_id})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual([row["id"] for row in response.json()["tasks"]], [task["id"]])
        self.assertEqual([row["id"] for row in response.json()["programs"]], [mine["id"]])
        self.assertEqual(self.client.get("/api/admin/programs/" + other["id"]).status_code, 200)

    def test_calendar_date_boundaries_use_jakarta_days(self):
        for name, start, end in (
            ("Early Jakarta", "2026-01-01T17:30:00Z", "2026-01-01T18:00:00Z"),
            ("Next Jakarta day", "2026-01-02T17:30:00Z", "2026-01-02T18:00:00Z"),
        ):
            response = self.client.post("/api/admin/calendar-events", json={
                "period_id": self.period_id, "scope_type": "ORGANIZATION", "title": name,
                "starts_at": start, "ends_at": end})
            self.assertEqual(response.status_code, 201, response.text)
        response = self.client.get("/api/admin/calendar-events", params={
            "period_id": self.period_id, "start": "2026-01-02", "end": "2026-01-02"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual([row["title"] for row in response.json()["items"]], ["Early Jakarta"])

    def test_monitoring_counts_each_original_task_once(self):
        self.create_task()
        program = self.create_program()
        self.create_task(scope_type="PROGRAM", scope_id=program["id"])
        response = self.client.get("/api/admin/monitoring/units", params={"period_id": self.period_id})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["total"]["TODO"], 2)

    def test_scope_rules_and_optimistic_conflict(self):
        self.sign_in(self.hunting)
        general = self.create_task()
        self.create_task(scope_type="DEPARTMENT", scope_id=self.units["Departemen Internal"])
        self.create_task(scope_type="DIVISION", scope_id=self.units["Hunting"])
        response = self.client.post("/api/admin/tasks", json={"period_id": self.period_id,
            "scope_type": "DIVISION", "scope_id": self.units["Modeling"], "title": "Denied"})
        self.assertEqual(response.status_code, 403)
        self.sign_in(self.external)
        response = self.client.patch("/api/admin/tasks/" + general["id"], json={"expected_version": 1,
            "title": general["title"], "status": "DONE"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.patch("/api/admin/tasks/" + general["id"], json={"expected_version": 1,
            "title": "Stale write", "status": "TODO"}).status_code, 409)

    def test_board_name_identifies_shared_task_titles(self):
        self.assertEqual(self.create_task()["board_name"], "Umum UKM")
        for name in ("Proker A", "Proker B"):
            program = self.create_program(name=name)
            task = self.create_task(scope_type="PROGRAM", scope_id=program["id"])
            self.assertEqual(self.client.get("/api/admin/tasks/" + task["id"]).json()["board_name"], name)
        self.sign_in(self.hunting)
        unit = self.create_task(scope_type="DIVISION", scope_id=self.units["Hunting"])
        self.assertEqual(unit["board_name"], "Hunting")
        board = self.client.get("/api/admin/tasks", params={"period_id": self.period_id,
            "scope_type": "DEPARTMENT", "scope_id": self.units["Departemen Internal"]})
        self.assertEqual({row["board_name"] for row in board.json()["items"]}, {"Hunting", "Proker A", "Proker B"})

    def test_only_chair_archives_and_successor_reads_unchanged_jejak(self):
        task = self.create_task()
        successor_response = self.client.post("/api/admin/periods", json={"name": "Penerus-" + secrets.token_hex(8)})
        self.assertEqual(successor_response.status_code, 201, successor_response.text)
        successor_id = successor_response.json()["id"]
        params = {"successor_for": self.period_id}

        def successor_ready():
            periods = self.client.get("/api/admin/periods", params=params)
            self.assertEqual(periods.status_code, 200)
            return next(row["successor_ready"] for row in periods.json()["items"] if row["id"] == successor_id)

        self.assertFalse(successor_ready())
        response = self.client.put("/api/admin/memberships", json={"user_id": self.external["id"],
            "period_id": successor_id, "positions": ["CHAIR"], "unit_ids": []})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(successor_ready())
        for model in (UserRow, PositionRow, BoardMembershipRow):
            with self.test_database.transaction() as session:
                row = session.get(UserRow, self.external["id"]) if model is UserRow else session.scalar(
                    select(model).where(model.user_id == self.external["id"], model.period_id == successor_id))
                row.active = False
            self.assertFalse(successor_ready())
            with self.test_database.transaction() as session:
                session.merge(row).active = True
        self.sign_in(self.hunting)
        self.assertEqual(self.client.get("/api/admin/periods", params=params).status_code, 403)
        body = {"successor_period_id": successor_id, "confirmed": True}
        path = f"/api/admin/periods/{self.period_id}/archive"
        self.assertEqual(self.client.post(path, json=body).status_code, 403)
        self.sign_in(self.root)
        response = self.client.post(path, json=body)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get("/api/admin/me").status_code, 403)
        self.assertEqual(self.client.post("/api/admin/auth/logout").status_code, 204)
        self.sign_in(self.external)
        history = self.client.get(f"/api/admin/periods/{self.period_id}/history")
        self.assertEqual(history.status_code, 200, history.text)
        self.assertEqual(history.json()["tasks"]["TODO"], 1)
        self.assertEqual(self.client.patch("/api/admin/tasks/" + task["id"], json={"expected_version": 1,
            "title": "Archived", "status": "DONE"}).status_code, 409)

    def test_pic_revoke_preserves_other_task_and_manual_sources(self):
        program = self.create_program()
        first = self.create_task(scope_type="PROGRAM", scope_id=program["id"], assignee_user_id=self.external["id"])
        second = self.create_task(scope_type="PROGRAM", scope_id=program["id"], assignee_user_id=self.external["id"])
        path = f'/api/admin/programs/{program["id"]}'
        self.sign_in(self.hunting)
        self.assertEqual(self.client.post(path + "/assignments", json={"user_id": self.external["id"]}).status_code, 200)
        self.sign_in(self.root)
        self.assertEqual(self.client.patch("/api/admin/tasks/" + first["id"], json={"title": "Changed PIC", "expected_version": 1}).status_code, 200)
        self.sign_in(self.external)
        self.assertTrue(self.client.get(path).json()["capabilities"]["edit"])
        self.sign_in(self.root)
        self.assertEqual(self.client.request("DELETE", "/api/admin/tasks/" + second["id"], json={"expected_version": 1}).status_code, 200)
        self.sign_in(self.external)
        self.assertTrue(self.client.get(path).json()["capabilities"]["edit"])
        self.sign_in(self.hunting)
        self.assertEqual(self.client.delete(path + "/assignments/" + self.external["id"]).status_code, 200)
        self.sign_in(self.external)
        self.assertFalse(self.client.get(path).json()["capabilities"]["edit"])

    def test_failed_audit_rolls_back_task_and_pic_grant_together(self):
        from unittest.mock import patch
        from app.errors import ApiError
        program = self.create_program()
        with self.test_database.transaction() as session:
            before = session.scalar(select(func.count()).select_from(TaskRow))
        with patch("app.work.service.record_audit", side_effect=ApiError(503, "audit_unavailable", "Audit unavailable")):
            response = self.client.post("/api/admin/tasks", json={"period_id": self.period_id,
                "scope_type": "PROGRAM", "scope_id": program["id"], "title": "Must roll back",
                "assignee_user_id": self.external["id"]})
        self.assertEqual(response.status_code, 503)
        with self.test_database.transaction() as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(TaskRow)), before)
            self.assertEqual(session.scalar(select(func.count()).select_from(GrantRow).where(
                GrantRow.program_id == program["id"], GrantRow.source == "TASK_PIC")), 0)

    def test_login_failures_are_persisted_and_blocked_ip_creates_no_extra_user_buckets(self):
        for _ in range(self.settings.login_max_attempts):
            response = self.client.post("/api/admin/auth/login", json={"username": self.root["username"], "password": "incorrect"})
            self.assertEqual(response.status_code, 401)
        with self.test_database.transaction() as session:
            before = session.scalar(select(func.count()).select_from(LoginAttemptRow))
        response = self.client.post("/api/admin/auth/login", json={"username": "invented-user", "password": "incorrect"})
        self.assertEqual(response.status_code, 429)
        with self.test_database.transaction() as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(LoginAttemptRow)), before)

    def test_archived_identity_directory_survives_later_master_name_changes(self):
        successor = self.client.post("/api/admin/periods", json={"name": "Identity-" + secrets.token_hex(8)}).json()
        self.assertEqual(self.client.put("/api/admin/memberships", json={"user_id": self.external["id"],
            "period_id": successor["id"], "positions": ["CHAIR"]}).status_code, 200)
        response = self.client.post(f"/api/admin/periods/{self.period_id}/archive",
            json={"successor_period_id": successor["id"], "confirmed": True})
        self.assertEqual(response.status_code, 200, response.text)
        self.sign_in(self.external)
        self.assertEqual(self.client.patch("/api/admin/users/" + self.root["id"],
            json={"display_name": "Nama Master Baru"}).status_code, 200)
        directory = self.client.get("/api/admin/directory", params={"period_id": self.period_id}).json()["items"]
        self.assertEqual(next(person["display_name"] for person in directory if person["id"] == self.root["id"]), "Test root")
        first = self.client.get("/api/admin/directory", params={"period_id": self.period_id, "limit": 2}).json()
        second = self.client.get("/api/admin/directory", params={"period_id": self.period_id, "limit": 2, "offset": 2}).json()
        self.assertTrue(first["has_more"])
        self.assertFalse(second["has_more"])
        self.assertEqual(first["items"] + second["items"], directory)
        summary = self.client.get(f"/api/admin/periods/{self.period_id}/history").json()
        self.assertEqual(summary["archived_by_name"], "Test root")

    def test_program_activity_is_readable_by_other_boards_without_account_audit_leak(self):
        program = self.create_program()
        self.sign_in(self.external)
        response = self.client.get(f'/api/admin/programs/{program["id"]}/activity')
        self.assertEqual(response.status_code, 200, response.text)
        events = response.json()["items"]
        self.assertEqual(events[0]["action"], "program.created")
        self.assertEqual(events[0]["actor_name"], "Test root")
        self.assertNotIn("password", response.text)
        self.assertNotIn("token", response.text)

    def test_chair_can_split_reorder_rename_and_reset_unused_committee_groups(self):
        program = self.create_program()
        self.sign_in(self.chair)
        path = f'/api/admin/programs/{program["id"]}/committee/structure'
        pdd, design, pubdoc = identifier(), identifier(), identifier()
        groups = [{"id": pdd, "label": "PDD", "parent_id": None, "sort_order": 0},
            {"id": design, "label": "Desain", "parent_id": pdd, "sort_order": 2},
            {"id": pubdoc, "label": "Pubdok", "parent_id": pdd, "sort_order": 1}]
        response = self.client.put(path, json={"expected_version": 1, "groups": groups})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual([row["label"] for row in response.json()["groups"]], ["PDD", "Pubdok", "Desain"])
        groups[0]["label"] = "Media"
        groups[1]["sort_order"], groups[2]["sort_order"] = 1, 2
        response = self.client.put(path, json={"expected_version": 2, "groups": groups})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual([row["label"] for row in response.json()["groups"]], ["Media", "Desain", "Pubdok"])
        self.assertEqual(self.client.put(path, json={"expected_version": 3, "groups": []}).status_code, 200)
        with self.test_database.transaction() as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(GrantRow).where(GrantRow.program_id == program["id"])), 2)

    def test_recording_account_in_committee_does_not_grant_program_access(self):
        program = self.create_program()
        response = self.client.post(f'/api/admin/programs/{program["id"]}/committee/members', json={
            "expected_version": 1, "display_name": "Panitia berakun", "role": "Humas", "user_id": self.external["id"]})
        self.assertEqual(response.status_code, 201, response.text)
        self.sign_in(self.external)
        self.assertFalse(self.client.get(f'/api/admin/programs/{program["id"]}').json()["capabilities"]["edit"])

    def frozen_program_fixture(self):
        program = self.create_program()
        path = f'/api/admin/programs/{program["id"]}'
        member = self.client.post(path + "/committee/members", json={"expected_version": 1,
            "display_name": "Panitia", "role": "Anggota"}).json()
        budget = self.client.post(path + "/budget", json={"name": "Item", "quantity": "1", "unit": "pak", "unit_price": "1000"}).json()["items"][0]
        task = self.create_task(scope_type="PROGRAM", scope_id=program["id"])
        agenda_body = {"title": "Agenda", "starts_at": "2026-12-01T09:00:00Z", "ends_at": "2026-12-01T10:00:00Z"}
        response = self.client.post("/api/admin/calendar-events", json={**agenda_body,
            "period_id": self.period_id, "scope_type": "PROGRAM", "scope_id": program["id"]})
        self.assertEqual(response.status_code, 201, response.text)
        agenda = response.json()
        return program, member, budget, task, agenda, agenda_body

    def assert_all_child_mutations_frozen(self, fixture):
        program, member, budget, task, agenda, agenda_body = fixture
        path = f'/api/admin/programs/{program["id"]}'
        version = {"expected_version": 2}
        cases = [
            ("PATCH", path, {**version, "name": "Forbidden"}),
            ("PUT", path + "/chairperson", {**version, "chairperson_name": "Forbidden"}),
            ("POST", path + "/assignments", {"user_id": self.external["id"]}),
            ("DELETE", path + "/assignments/" + self.external["id"], None),
            ("PUT", path + "/committee/structure", {**version, "groups": []}),
            ("POST", path + "/committee/template", version),
            ("POST", path + "/committee/members", {**version, "display_name": "Forbidden", "role": "Anggota"}),
            ("PUT", path + "/committee/members/" + member["id"], {**version, "display_name": "Forbidden", "role": "Anggota"}),
            ("DELETE", path + "/committee/members/" + member["id"], version),
            ("POST", path + "/budget", {"name": "Forbidden", "unit": "pak", "quantity": "1", "unit_price": "1"}),
            ("PUT", path + "/budget/" + budget["id"], {"name": "Forbidden", "unit": "pak", "quantity": "1", "unit_price": "1"}),
            ("DELETE", path + "/budget/" + budget["id"], {"expected_version": 1}),
            ("POST", "/api/admin/tasks", {"period_id": self.period_id, "scope_type": "PROGRAM", "scope_id": program["id"], "title": "Forbidden"}),
            ("PATCH", "/api/admin/tasks/" + task["id"], {"expected_version": 1, "title": "Forbidden", "status": "DONE"}),
            ("DELETE", "/api/admin/tasks/" + task["id"], {"expected_version": 1}),
            ("PATCH", "/api/admin/tasks/" + task["id"] + "/status", {"expected_version": 1, "status": "REVIEW"}),
            ("POST", "/api/admin/calendar-events", {**agenda_body, "period_id": self.period_id, "scope_type": "PROGRAM", "scope_id": program["id"]}),
            ("PATCH", "/api/admin/calendar-events/" + agenda["id"], {**agenda_body, "expected_version": 1}),
            ("DELETE", "/api/admin/calendar-events/" + agenda["id"], {"expected_version": 1}),
        ]
        for method, route, body in cases:
            with self.subTest(method=method, route=route):
                response = self.client.request(method, route, json=body)
                self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(self.client.get("/api/admin/tasks/" + task["id"]).json()["status"], "TODO")

    def test_every_program_child_mutation_is_rejected_after_close(self):
        fixture = self.frozen_program_fixture()
        response = self.client.post(f'/api/admin/programs/{fixture[0]["id"]}/close', json={"expected_version": 2, "confirmed_unfinished": True})
        self.assertEqual(response.status_code, 200, response.text)
        self.assert_all_child_mutations_frozen(fixture)

    def test_every_program_child_mutation_is_rejected_after_period_archive(self):
        fixture = self.frozen_program_fixture()
        successor = self.client.post("/api/admin/periods", json={"name": "Freeze-" + secrets.token_hex(8)}).json()
        self.assertEqual(self.client.put("/api/admin/memberships", json={"user_id": self.external["id"],
            "period_id": successor["id"], "positions": ["CHAIR"]}).status_code, 200)
        response = self.client.post(f"/api/admin/periods/{self.period_id}/archive", json={"successor_period_id": successor["id"], "confirmed": True})
        self.assertEqual(response.status_code, 200, response.text)
        self.sign_in(self.external)
        self.assert_all_child_mutations_frozen(fixture)

    def test_calendar_mutation_follows_scope_and_program_dates_are_derived(self):
        program = self.create_program(starts_on="2026-12-01", ends_on="2026-12-02")
        self.sign_in(self.external)
        body = {"period_id": self.period_id, "scope_type": "DEPARTMENT", "scope_id": self.units["Departemen Internal"],
            "title": "Agenda", "starts_at": "2026-12-01T09:00:00Z", "ends_at": "2026-12-01T10:00:00Z"}
        self.assertEqual(self.client.post("/api/admin/calendar-events", json=body).status_code, 403)
        self.assertEqual(self.client.post("/api/admin/calendar-events", json={**body, "scope_type": "ORGANIZATION", "scope_id": None}).status_code, 201)
        response = self.client.get("/api/admin/calendar-events", params={"period_id": self.period_id, "start": "2026-12-01", "end": "2026-12-31"})
        self.assertEqual(response.status_code, 200, response.text)
        derived = next(item for item in response.json()["items"] if item["source"] == "PROGRAM")
        self.assertEqual(derived["starts_on"], "2026-12-01")
        self.assertFalse(derived["can_edit"])

    def test_last_chair_cannot_be_removed_before_a_replacement_is_ready(self):
        body = {"user_id": self.root["id"], "period_id": self.period_id, "positions": [], "unit_ids": []}
        response = self.client.put("/api/admin/memberships", json=body)
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(self.client.get("/api/admin/users").status_code, 200)
        self.assertEqual(self.client.put("/api/admin/memberships", json={"user_id": self.external["id"],
            "period_id": self.period_id, "positions": ["CHAIR"]}).status_code, 200)
        response = self.client.put("/api/admin/memberships", json=body)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get("/api/admin/users").status_code, 403)

    def test_review_status_counts_pagination_and_status_only_update(self):
        program = self.create_program()
        task = self.client.post('/api/admin/tasks', json={
            'period_id': self.period_id, 'scope_type': 'PROGRAM', 'scope_id': program['id'],
            'title': 'Review fixture', 'description': 'Keep description',
            'assignee_user_id': self.external['id'], 'status': 'REVIEW'}).json()
        self.assertEqual(task['status'], 'REVIEW')
        with self.test_database.transaction() as session:
            grants_before = list(session.scalars(select(GrantRow.id).where(GrantRow.program_id == program['id'])))
        response = self.client.patch('/api/admin/tasks/' + task['id'] + '/status', json={
            'status': 'DONE', 'expected_version': task['version']})
        self.assertEqual(response.status_code, 200, response.text)
        changed = response.json()
        self.assertEqual(changed['description'], 'Keep description')
        self.assertEqual(changed['assignee_user_id'], self.external['id'])
        self.assertEqual(changed['version'], task['version'] + 1)
        self.assertEqual(self.client.patch('/api/admin/tasks/' + task['id'] + '/status', json={
            'status': 'TODO', 'expected_version': task['version']}).status_code, 409)
        with self.test_database.transaction() as session:
            self.assertEqual(list(session.scalars(select(GrantRow.id).where(GrantRow.program_id == program['id']))), grants_before)
        page = self.client.get('/api/admin/tasks', params={'period_id': self.period_id, 'status': 'TODO', 'limit': 1}).json()
        self.assertEqual(page['items'], [])
        self.assertEqual(page['counts'], {'TODO': 0, 'IN_PROGRESS': 0, 'REVIEW': 0, 'DONE': 1})
        self.client.patch('/api/admin/tasks/' + task['id'] + '/status', json={'status': 'REVIEW', 'expected_version': changed['version']})
        monitoring = self.client.get('/api/admin/monitoring/units', params={'period_id': self.period_id}).json()
        self.assertEqual(monitoring['total']['REVIEW'], 1)
        history = self.client.get('/api/admin/periods/' + self.period_id + '/history').json()
        self.assertEqual(history['tasks']['REVIEW'], 1)
        for index in range(3):
            self.assertEqual(self.client.post('/api/admin/tasks', json={
                'period_id': self.period_id, 'scope_type': 'ORGANIZATION',
                'title': f'Pagination fixture {index}'}).status_code, 201)
        page = self.client.get('/api/admin/tasks', params={
            'period_id': self.period_id, 'status': 'TODO', 'limit': 1}).json()
        self.assertEqual(len(page['items']), 1)
        self.assertTrue(page['has_more'])
        self.assertEqual(page['counts']['TODO'], 3)
        self.sign_in(self.hunting)
        current = self.client.get('/api/admin/tasks/' + task['id']).json()
        self.assertEqual(self.client.patch('/api/admin/tasks/' + task['id'] + '/status', json={
            'status': 'DONE', 'expected_version': current['version']}).status_code, 403)
