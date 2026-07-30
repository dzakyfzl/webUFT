from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models import Acara
from app.repositories.acara_repository import AcaraRepository


def test_repository_owns_database_query_and_crud():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    repository = AcaraRepository(session)
    waktu = datetime(2026, 7, 22, 10, 0)
    entity = repository.create(nama="UFT", deskripsi="D", tempat="T", waktu=waktu, fileID=None, status="Draft")
    assert repository.get(entity.acaraID).nama == "UFT"
    repository.update(entity.acaraID, nama="UFT 2", deskripsi="D", tempat="T", waktu=waktu, fileID=None, status="Aktif")
    assert repository.get(entity.acaraID).status == "Aktif"
    session.close()
