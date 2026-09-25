import os
import urllib.parse

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()  # look in CWD first
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))  # project root fallback


def _build_database_url() -> str:
    """Construct DATABASE_URL dari env parts, atau gunakan DATABASE_URL langsung jika ada."""
    url = os.getenv("DATABASE_URL")
    if url:
        return url

    user = os.getenv("DATABASE_USERNAME", "")
    password = urllib.parse.quote_plus(os.getenv("DATABASE_PASSWORD", ""))
    host = os.getenv("DATABASE_HOST", "localhost")
    port = os.getenv("DATABASE_PORT", "5432")
    db = os.getenv("DATABASE_DATABASE", "UFT")

    if not user:
        raise ValueError(
            "Database belum dikonfigurasi. "
            "Isi DATABASE_USERNAME/PASSWORD/HOST/PORT/DATABASE di .env, "
            "atau set DATABASE_URL langsung."
        )

    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db}"


DATABASE_URL = _build_database_url()

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()
