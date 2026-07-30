import csv
import io

from app.core.tokens import create_refresh_token
from app.repositories.form_repository import FormRepository
from app.services.result import ServiceResult


class FormService:
    def __init__(self, repository: FormRepository):
        self.repository = repository

    def submit(self, acara_id: int, data, guest_token: str):
        token_count, number_count, name_count = self.repository.submission_counts(guest_token, data.nomor, data.nama.lower(), acara_id)
        if guest_token != "Baru" and token_count > 0 and number_count > 0 and name_count > 0:
            return ServiceResult({"message": "Unauthorized"}, 403)
        if self.repository.acara_status(acara_id) != "aktif":
            return ServiceResult({"message": "Acara tidak sedang berlangsung"}, 403)
        token = create_refresh_token(data.nama, "Pengguna", [])
        try:
            self.repository.create_token(token)
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)
        try:
            self.repository.create_response_and_choice(acara_id, token, data)
            return ServiceResult({"message": "Form submitted successfully", "refresh_token": token})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def list(self, acara_id: int, user: dict):
        if user.get("role") != "Admin" and "Kelola Acara" not in user.get("access", []):
            return ServiceResult({"message": "Unauthorized"}, 403)
        return self._database_result(lambda: self.repository.list_respondens(acara_id))

    def ranked(self, acara_id: int, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            rows = self.repository.ranked_karya(acara_id)
            return ServiceResult([{"nama": row[0], "karyaID": row[1], "fileID": row[2], "deskripsi": row[3], "pemilik": row[4], "jumlah_pilihan": row[5]} for row in rows])
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    def csv_export(self, acara_id: int, user: dict):
        denied = self._authorize(user)
        if denied:
            return denied
        try:
            rows = self.repository.csv_rows(acara_id)
            acara_name = self.repository.acara_name(acara_id)
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=["nama", "prodi_instansi", "nomor", "nim", "karya"])
            writer.writeheader()
            writer.writerows([{"nama": row.nama, "prodi_instansi": row.prodi_instansi, "nomor": row.nomor, "nim": row.nim, "karya": row.karya_nama} for row in rows])
            output.seek(0)
            safe_name = str(acara_name).replace(" ", "_") if acara_name else f"Acara_{acara_id}"
            return ServiceResult({"content": output.getvalue(), "filename": f"data_absensi_{safe_name}.csv"})
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)

    @staticmethod
    def _authorize(user: dict):
        if user.get("role") != "Admin" or "Kelola Acara" not in user.get("access", []):
            return ServiceResult({"message": "Unauthorized"}, 403)

    @staticmethod
    def _database_result(callback):
        try:
            return ServiceResult(callback())
        except Exception as exc:
            print(f"Database error: {exc}")
            return ServiceResult({"message": "Database error"}, 500)
