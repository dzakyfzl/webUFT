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

engine = create_engine(
    DATABASE_URL,
    # Pool settings — ditingkatkan untuk handle concurrent requests
    pool_size=10,           # jumlah koneksi persistent (dari 5 → 10)
    max_overflow=20,        # koneksi overflow tambahan (dari 10 → 20)
    pool_timeout=30,        # timeout tunggu koneksi dari pool
    pool_recycle=1800,      # recycle koneksi setiap 30 menit (cegah stale)
    pool_pre_ping=True,     # test koneksi sebelum pakai (cegah "connection closed" error)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        # Hanya rollback saat ada error, bukan setiap request
        db.rollback()
        raise
    finally:
        db.close()
