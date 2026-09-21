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
    assert repository.get_public(entity.acaraID) is not None
    session.close()


def test_form_repository_get_acara_and_karya():
    from app.models import Karya
    from app.repositories.form_repository import FormRepository

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()

    acara_repo = AcaraRepository(session)
    waktu = datetime(2026, 7, 22, 10, 0)
    waktu_selesai = datetime(2026, 7, 22, 18, 0)
    acara = acara_repo.create(nama="Pameran", deskripsi="D", tempat="T", waktu=waktu, waktu_selesai=waktu_selesai, fileID=None, status="Aktif")

    karya = Karya(nama="Lukisan", deskripsi="Indah", pemilik="Artis", acaraID=acara.acaraID, fileID=None)
    session.add(karya)
    session.commit()
    session.refresh(karya)

    form_repo = FormRepository(session)
    fetched_acara = form_repo.get_acara(acara.acaraID)
    assert fetched_acara is not None
    assert fetched_acara.nama == "Pameran"
    assert fetched_acara.waktu_selesai == waktu_selesai

    fetched_karya = form_repo.get_karya(karya.karyaID, acara.acaraID)
    assert fetched_karya is not None
    assert fetched_karya.nama == "Lukisan"

    session.close()

