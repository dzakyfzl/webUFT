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
    def fail_delete(_id):
        raise Exception("name 'Jawaban' is not defined")
    repository.delete_pilihan = fail_delete
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
    data = FormCreate(nama="User", prodi_instansi="UFT", nim="2", karyaID=3)
    result = FormService(repository).submit(1, data, "existing-token")
    assert result.status_code == 403
    assert result.payload == {"message": "Unauthorized"}


def test_csv_response_transformation_and_filename_are_preserved():
    repository = StubRepository()
    repository.csv_rows = lambda _id: [SimpleNamespace(nama="a", prodi_instansi="b", nim="d", karya_nama="e")]
    repository.acara_name = lambda _id: "Acara UFT"
    result = FormService(repository).csv_export(1, ADMIN_ACARA)
    assert result.status_code == 200
    assert result.payload["filename"] == "data_absensi_Acara_UFT.csv"
    assert result.payload["content"].splitlines() == ["nama,prodi_instansi,nim,karya", "a,b,d,e"]


def test_vote_rejected_before_acara_waktu():
    from datetime import datetime, timedelta
    repository = StubRepository()
    repository.submission_counts = lambda *_args: (0, 0, 0)
    repository.get_acara = lambda _id: SimpleNamespace(
        status="Aktif",
        waktu=datetime.now() + timedelta(hours=2),
        waktu_selesai=datetime.now() + timedelta(hours=5),
    )
    data = FormCreate(nama="User", prodi_instansi="UFT", nim="12345", karyaID=1)
    result = FormService(repository).submit(1, data, "Baru")
    assert result.status_code == 403
    assert result.payload == {"message": "Acara tidak sedang berlangsung"}


def test_vote_rejected_after_acara_waktu_selesai():
    from datetime import datetime, timedelta
    repository = StubRepository()
    repository.submission_counts = lambda *_args: (0, 0, 0)
    repository.get_acara = lambda _id: SimpleNamespace(
        status="Aktif",
        waktu=datetime.now() - timedelta(hours=5),
        waktu_selesai=datetime.now() - timedelta(hours=1),
    )
    data = FormCreate(nama="User", prodi_instansi="UFT", nim="12345", karyaID=1)
    result = FormService(repository).submit(1, data, "Baru")
    assert result.status_code == 403
    assert result.payload == {"message": "Acara tidak sedang berlangsung"}


def test_vote_success_issues_token_expiring_at_waktu_selesai():
    from datetime import datetime, timedelta
    from app.core.tokens import decode_token

    waktu_selesai = (datetime.now() + timedelta(hours=3)).replace(microsecond=0)
    repository = StubRepository()
    repository.submission_counts = lambda *_args: (0, 0, 0)
    repository.get_acara = lambda _id: SimpleNamespace(
        status="Aktif",
        waktu=datetime.now() - timedelta(hours=1),
        waktu_selesai=waktu_selesai,
    )
    created_tokens = []
    created_responses = []
    repository.create_token = lambda tok: created_tokens.append(tok)
    repository.create_response_and_choice = lambda aid, tok, dt: created_responses.append((aid, tok, dt))

    data = FormCreate(nama="Dzaky", prodi_instansi="UFT", nim="12345", karyaID=1)
    result = FormService(repository).submit(1, data, "Baru")
    assert result.status_code == 200
    assert "refresh_token" in result.payload
    token = result.payload["refresh_token"]
    assert token in created_tokens
    assert len(created_responses) == 1
    assert created_responses[0][0] == 1
    assert created_responses[0][1] == token

    decoded = decode_token(token)
    assert decoded is not None
    assert decoded["sub"] == "Dzaky"
    assert decoded["exp"] == int(waktu_selesai.timestamp())


def test_vote_success_with_empty_or_none_nim():
    from datetime import datetime, timedelta

    waktu_selesai = (datetime.now() + timedelta(hours=3)).replace(microsecond=0)
    repository = StubRepository()
    repository.submission_counts = lambda *_args: (0, 0, 0)
    repository.get_acara = lambda _id: SimpleNamespace(
        status="Aktif",
        waktu=datetime.now() - timedelta(hours=1),
        waktu_selesai=waktu_selesai,
    )
    created_tokens = []
    created_responses = []
    repository.create_token = lambda tok: created_tokens.append(tok)
    repository.create_response_and_choice = lambda aid, tok, dt: created_responses.append((aid, tok, dt))

    # Test with nim omitted (None)
    data_none_nim = FormCreate(nama="Dzaky", prodi_instansi="UFT", karyaID=1)
    result = FormService(repository).submit(1, data_none_nim, "Baru")
    assert result.status_code == 200
    assert created_responses[-1][2].nim is None

    # Test with empty string nim ("")
    data_empty_nim = FormCreate(nama="Dzaky", prodi_instansi="UFT", nim="", karyaID=1)
    result = FormService(repository).submit(1, data_empty_nim, "Baru")
    assert result.status_code == 200
    assert created_responses[-1][2].nim == ""


