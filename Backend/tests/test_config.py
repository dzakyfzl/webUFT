import unittest

from app.config import ConfigurationError, Settings


class SettingsTest(unittest.TestCase):
    # Parsing only: no connection to this deliberately non-resolving hostname.
    DATABASE = "postgresql+psycopg://operator:do-not-log@database.invalid/erp"

    def load(self, **overrides):
        return Settings.from_environment({"DATABASE_URL": self.DATABASE, **overrides})

    def test_missing_database_fails_without_a_dummy_fallback(self):
        with self.assertRaisesRegex(ConfigurationError, "DATABASE_URL is required"):
            Settings.from_environment({})

    def test_only_postgresql_psycopg_configuration_is_accepted(self):
        for value in ("sqlite:///tmp/erp.db", "mysql://host/erp", "postgresql://host/erp",
                      "postgresql+psycopg://host/", "postgresql+psycopg://host:99999/erp",
                      "postgresql+psycopg://host:bad/erp", "postgresql+psycopg://[broken/erp"):
            with self.subTest(value=value), self.assertRaises(ConfigurationError):
                self.load(DATABASE_URL=value)

    def test_database_credentials_never_appear_in_repr_or_validation_errors(self):
        self.assertNotIn("do-not-log", repr(self.load()))
        for value in ("mysql://operator:do-not-log@host/erp",
                      "postgresql+psycopg://operator:do-not-log@host:bad/erp"):
            with self.assertRaises(ConfigurationError) as error:
                self.load(DATABASE_URL=value)
            self.assertNotIn("do-not-log", str(error.exception))

    def test_production_requires_an_explicit_https_origin(self):
        for changes in ({}, {"ERP_PUBLIC_ORIGIN": "http://erp.example"}):
            with self.assertRaises(ConfigurationError):
                self.load(ERP_ENV="production", **changes)
        settings = self.load(ERP_ENV="production", ERP_PUBLIC_ORIGIN="https://erp.example/")
        self.assertEqual(settings.public_origin, "https://erp.example")
        self.assertTrue(settings.secure_cookie)

    def test_development_http_origin_has_explicit_insecure_cookie_setting(self):
        settings = self.load()
        self.assertEqual(settings.public_origin, "http://localhost:3000")
        self.assertFalse(settings.secure_cookie)
        self.assertTrue(self.load(ERP_PUBLIC_ORIGIN="https://localhost").secure_cookie)

    def test_uppercase_https_is_normalized_and_keeps_secure_cookie(self):
        settings = self.load(ERP_ENV="production", ERP_PUBLIC_ORIGIN="HTTPS://ERP.EXAMPLE/")
        self.assertEqual(settings.public_origin, "https://erp.example")
        self.assertTrue(settings.secure_cookie)

    def test_origins_cannot_contain_path_credentials_query_or_fragment(self):
        for value in ("https://user:password@erp.example", "https://erp.example/admin",
                      "https://erp.example?x=1", "https://erp.example#fragment",
                      "javascript:alert(1)", "https://erp.example:bad", "https://erp.example:0",
                      " https://erp.example", "https://erp\n.example", "https://erp example"):
            with self.subTest(value=value), self.assertRaises(ConfigurationError):
                self.load(ERP_PUBLIC_ORIGIN=value)

    def test_connection_pool_has_small_explicit_bounds(self):
        settings = self.load()
        self.assertEqual(settings.pool_size, 3)
        self.assertEqual(settings.pool_max_overflow, 2)
        self.assertEqual(self.load(ERP_DB_MAX_OVERFLOW="0").pool_max_overflow, 0)
        for key in ("ERP_DB_POOL_SIZE", "ERP_DB_MAX_OVERFLOW"):
            for value in ("-1", "11", "invalid"):
                with self.subTest(key=key, value=value), self.assertRaises(ConfigurationError):
                    self.load(**{key: value})

    def test_session_and_login_limit_settings_are_validated(self):
        for key in ("ERP_SESSION_TTL_SECONDS", "ERP_LOGIN_MAX_ATTEMPTS", "ERP_LOGIN_WINDOW_SECONDS"):
            for value in ("0", "999999999", "invalid"):
                with self.subTest(key=key, value=value), self.assertRaises(ConfigurationError):
                    self.load(**{key: value})

    def test_unknown_environment_fails_instead_of_using_development_defaults(self):
        with self.assertRaises(ConfigurationError):
            self.load(ERP_ENV="prod")


if __name__ == "__main__":
    unittest.main()
