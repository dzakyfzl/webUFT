"""Read existing dotenv settings explicitly without shell evaluation."""

import os
from pathlib import Path

from sqlalchemy.engine import URL

from app.config import Settings


def settings(env_file: Path | None = None) -> Settings:
    values = {}
    source = env_file or Path(__file__).resolve().parents[2] / ".env"
    if source.exists():
        for line in source.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip('"').strip("'")
    values.update(os.environ)
    if not values.get("DATABASE_URL") and all(values.get(key) for key in (
            "DATABASE_HOST", "DATABASE_PORT", "DATABASE_USERNAME", "DATABASE_PASSWORD", "DATABASE_DATABASE")):
        try:
            port = int(values["DATABASE_PORT"])
        except ValueError:
            raise ValueError("DATABASE_PORT must be an integer") from None
        values["DATABASE_URL"] = URL.create(
            "postgresql+psycopg", username=values["DATABASE_USERNAME"], password=values["DATABASE_PASSWORD"],
            host=values["DATABASE_HOST"], port=port, database=values["DATABASE_DATABASE"]).render_as_string(hide_password=False)
    return Settings.from_environment(values)
