"""UAT launcher must reject unsafe targets before creating any fixture."""

from types import SimpleNamespace
import unittest
from unittest.mock import patch

from app.config import Settings
from scripts import uat_session as uat


class UatSessionTest(unittest.TestCase):
    def setUp(self):
        frontend_dependency = patch.object(uat.Path, "is_file", return_value=True)
        frontend_dependency.start()
        self.addCleanup(frontend_dependency.stop)
        default_password = patch.object(uat, "LOCAL_PASSWORD_FILE")
        self.password_file = default_password.start()
        self.password_file.read_text.side_effect = FileNotFoundError
        self.addCleanup(default_password.stop)

    def config(self, host="localhost", environment="test"):
        return Settings.from_environment({"DATABASE_URL": f"postgresql+psycopg://{host}/unused",
            "ERP_ENV": environment, "ERP_PUBLIC_ORIGIN": "https://example.com"})

    def test_remote_and_production_targets_are_rejected_before_database_access(self):
        for config in (self.config("example.com"), self.config(environment="production")):
            with self.subTest(environment=config.environment), patch.object(uat, "settings", return_value=config), patch.object(uat, "Database") as database:
                with self.assertRaises(uat.UatError):
                    uat.run(SimpleNamespace(check=True))
                database.assert_not_called()

    def test_busy_port_is_rejected_without_touching_database_or_password(self):
        with patch.object(uat, "settings", return_value=self.config()), patch.object(uat, "socket") as socket, patch.object(uat, "Database") as database, patch.object(uat, "getpass") as prompt:
            socket.socket.return_value.__enter__.return_value.bind.side_effect = OSError("busy")
            with self.assertRaises(uat.UatError):
                uat.run(SimpleNamespace(check=False))
            database.assert_not_called()
            prompt.assert_not_called()

    def test_existing_erp_records_are_rejected_before_fixture_and_prompt(self):
        with patch.object(uat, "settings", return_value=self.config()), patch.object(uat, "socket"), patch.object(uat, "Database") as database, patch.object(uat, "row_counts", return_value={"users": 1}), patch.object(uat, "getpass") as prompt, patch.object(uat.p0.PostgresApiTest, "setUp") as setup:
            with self.assertRaises(uat.UatError):
                uat.run(SimpleNamespace(check=False))
            setup.assert_not_called()
            prompt.assert_not_called()
            database.return_value.close.assert_called_once()

    def test_login_attempts_alone_do_not_block_rollback_uat(self):
        with patch.object(uat, "settings", return_value=self.config()), patch.object(uat, "socket"), patch.object(uat, "Database"), patch.object(uat, "row_counts", return_value={"users": 0, "login_attempts": 2}), patch.object(uat.p0.PostgresApiTest, "setUp", side_effect=RuntimeError("fixture reached")) as setup:
            with self.assertRaisesRegex(RuntimeError, "fixture reached"):
                uat.run(SimpleNamespace(check=True))
            setup.assert_called_once()

    def test_invalid_password_does_not_create_fixture(self):
        with patch.object(uat, "settings", return_value=self.config()), patch.object(uat, "socket"), patch.object(uat, "Database"), patch.object(uat, "row_counts", return_value={"users": 0}), patch.object(uat, "getpass", return_value="short"), patch.object(uat.p0.PostgresApiTest, "setUp") as setup:
            with self.assertRaises(uat.UatError):
                uat.run(SimpleNamespace(check=False))
            setup.assert_not_called()

    def test_local_default_skips_prompt_and_browser_check_uses_random_password(self):
        self.password_file.read_text.side_effect = None
        self.password_file.read_text.return_value = "local-fixture-test\n"
        with patch.object(uat, "getpass") as prompt, patch.object(uat.secrets, "token_urlsafe", return_value="generated-for-check"):
            self.assertEqual(uat.session_password(check=False), "local-fixture-test")
            self.assertEqual(uat.session_password(check=True), "generated-for-check")
            self.password_file.read_text.assert_called_once()
            prompt.assert_not_called()


if __name__ == "__main__":
    unittest.main()
