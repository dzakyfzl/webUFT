from types import SimpleNamespace

import pytest

from app.schemas.acara import AcaraCreate
from app.schemas.akun import AkunCreate
from app.schemas.form import FormCreate
from app.services.acara_service import AcaraService
from app.services.akun_service import AkunService
from app.services.form_service import FormService


ADMIN_ACARA = {"role": "Admin", "access": ["Kelola Acara"]}


class StubRepository:
    def rollback(self):
        self.rolled_back = True


def test_acara_authorization_is_service_responsibility():
    result = AcaraService(StubRepository()).get_admin(1, {"role": "Admin", "access": []})
    assert result.status_code == 403
    assert result.payload == {"message": "Unauthorized"}


def test_existing_acara_delete_failure_is_preserved():
    repository = StubRepository()
    repository.get = lambda _id: SimpleNamespace(fileID=None)
    repository.karya_paths = lambda _id: []
    repository.karya_file_ids = lambda _id: []
    repository.delete_pilihan = lambda _id: None
    result = AcaraService(repository).delete(1, ADMIN_ACARA)
    assert result.status_code == 500
    assert result.payload == {"message": "Database error: name 'Jawaban' is not defined"}
    assert repository.rolled_back is True


def test_login_invalid_credentials_shape_is_preserved():
    repository = StubRepository()
    repository.get_by_username = lambda _username: None
    result = AkunService(repository).login(AkunCreate(username="missing", password="wrong"))
    assert result.status_code == 401
    assert result.payload == {"message": "Invalid credentials"}


def test_form_duplicate_submission_is_rejected_before_status_check():
    repository = StubRepository()
    repository.submission_counts = lambda *_args: (1, 1, 1)
    repository.acara_status = lambda _id: pytest.fail("status query must not run")
    data = FormCreate(nama="User", prodi_instansi="UFT", nomor="1", nim="2", karyaID=3)
    result = FormService(repository).submit(1, data, "existing-token")
    assert result.status_code == 403
    assert result.payload == {"message": "Unauthorized"}


def test_csv_response_transformation_and_filename_are_preserved():
    repository = StubRepository()
    repository.csv_rows = lambda _id: [SimpleNamespace(nama="a", prodi_instansi="b", nomor="c", nim="d", karya_nama="e")]
    repository.acara_name = lambda _id: "Acara UFT"
    result = FormService(repository).csv_export(1, ADMIN_ACARA)
    assert result.status_code == 200
    assert result.payload["filename"] == "data_absensi_Acara_UFT.csv"
    assert result.payload["content"].splitlines() == ["nama,prodi_instansi,nomor,nim,karya", "a,b,c,d,e"]
