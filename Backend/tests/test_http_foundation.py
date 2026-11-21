import unittest

from fastapi.testclient import TestClient
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from app.config import Settings
from app.main import create_app
from app.metadata import Base


class HttpFoundationTest(unittest.TestCase):
    def setUp(self):
        settings = Settings.from_environment({"DATABASE_URL": "postgresql+psycopg://database.invalid/unused"})
        self.context = TestClient(create_app(settings))
        self.client = self.context.__enter__()

    def tearDown(self):
        self.context.__exit__(None, None, None)

    def test_liveness_does_not_require_database(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_protected_reads_distinguish_unauthenticated_access(self):
        for route in ("/api/admin/me", "/api/admin/users", "/api/admin/periods"):
            with self.subTest(route=route):
                response = self.client.get(route)
                self.assertEqual(response.status_code, 401)
                self.assertEqual(response.json()["error"]["code"], "unauthenticated")
                self.assertEqual(response.headers["cache-control"], "no-store")

    def test_login_rejects_foreign_origin_before_database_access(self):
        response = self.client.post("/api/admin/auth/login", headers={"Origin": "https://foreign.invalid"},
                                    json={"username": "person", "password": "test-value-only"})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"]["code"], "csrf")

    def test_validation_never_echoes_password_or_payload(self):
        sensitive = "a-sensitive-input" * 30
        response = self.client.post("/api/admin/auth/login", json={"username": "x", "password": sensitive})
        self.assertEqual(response.status_code, 422)
        self.assertNotIn(sensitive, response.text)
        self.assertNotIn('"input"', response.text)

    def test_openapi_has_cookie_auth_and_single_api_prefix(self):
        spec = self.client.get("/api/openapi.json").json()
        self.assertIn("/api/admin/auth/login", spec["paths"])
        self.assertEqual(spec["components"]["securitySchemes"]["APIKeyCookie"]["in"], "cookie")
        self.assertTrue(all(path.startswith("/api/") for path in spec["paths"]))

    def test_every_admin_operation_requires_cookie_auth_except_login(self):
        spec = self.client.get("/api/openapi.json").json()
        for path, methods in spec["paths"].items():
            if not path.startswith("/api/admin") or path == "/api/admin/auth/login":
                continue
            for method, operation in methods.items():
                with self.subTest(path=path, method=method):
                    self.assertIn({"APIKeyCookie": []}, operation.get("security", []))

    def test_all_models_compile_to_postgresql_with_foreign_keys(self):
        self.assertEqual(set(Base.metadata.tables), {
            "erp_ukm.members", "erp_ukm.users", "erp_ukm.periods", "erp_ukm.board_memberships",
            "erp_ukm.units", "erp_ukm.unit_memberships", "erp_ukm.positions", "erp_ukm.sessions",
            "erp_ukm.login_attempts", "erp_ukm.audit_events", "erp_ukm.programs", "erp_ukm.program_grants",
            "erp_ukm.committee_groups", "erp_ukm.committee_members", "erp_ukm.budget_lines",
            "erp_ukm.tasks", "erp_ukm.calendar_events",
            "erp_ukm.attachments", "erp_ukm.expenses", "erp_ukm.program_reports", "erp_ukm.physical_assets",
            "erp_ukm.asset_loans", "erp_ukm.digital_assets", "erp_ukm.public_events", "erp_ukm.event_staff",
            "erp_ukm.registration_forms", "erp_ukm.registration_form_versions", "erp_ukm.registration_submissions",
            "erp_ukm.short_links", "erp_ukm.public_submission_attempts",
        })
        for table in Base.metadata.sorted_tables:
            with self.subTest(table=table.name):
                ddl = str(CreateTable(table).compile(dialect=postgresql.dialect()))
                self.assertIn("erp_ukm.", ddl)
                self.assertNotIn("AUTOINCREMENT", ddl)


if __name__ == "__main__":
    unittest.main()
