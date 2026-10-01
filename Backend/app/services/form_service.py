import csv
from datetime import datetime
import io
import math

from app.core.tokens import create_guest_token, create_refresh_token
from app.repositories.form_repository import FormRepository
from app.services.result import ServiceResult

# Threshold accuracy maksimum (meter). Di atas ini dianggap sinyal buruk / potensi fake GPS.
_MAX_GPS_ACCURACY = 200.0
# Toleransi default jika admin tidak mengatur (meter)
_DEFAULT_TOLERANSI = 20


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Hitung jarak dua titik koordinat dalam meter (Haversine formula)."""
    R = 6_371_000  # radius bumi dalam meter
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class FormService:
    def __init__(self, repository: FormRepository):
        self.repository = repository

    @staticmethod
    def _parse_datetime(val) -> datetime | None:
        if val is None:
            return None
        if isinstance(val, datetime):
            return val
        if isinstance(val, str):
            try:
                return datetime.fromisoformat(val.replace(" ", "T"))
            except Exception:
                return None
        return None

    def submit(self, acara_id: int, data, guest_token: str):
        # ── Validasi Device Hash (paling awal — paling efisien) ───────────────
        # Cek apakah device ini sudah pernah vote di acara yang sama.
        # device_hash nullable: kalau tidak dikirim frontend, skip cek ini
        # dan fallback ke validasi token+nama di bawah.
        if data.device_hash:
            device_hash_clean = data.device_hash.strip()[:64]  # sanitasi panjang
            if device_hash_clean and self.repository.device_already_voted(device_hash_clean, acara_id):
                return ServiceResult({"message": "Kamu sudah pernah vote di acara ini."}, 403)

        token_count, name_count = self.repository.submission_counts(guest_token, data.nama.lower(), acara_id)
        if guest_token != "Baru" and token_count > 0 and name_count > 0:
            return ServiceResult({"message": "Unauthorized"}, 403)


        if hasattr(self.repository, "get_acara"):
            acara = self.repository.get_acara(acara_id)
            if not acara:
                return ServiceResult({"message": "Acara tidak sedang berlangsung"}, 403)
            status = getattr(acara, "status", None)
            if not status or str(status).lower() != "aktif":
                return ServiceResult({"message": "Acara tidak sedang berlangsung"}, 403)

            waktu_mulai = self._parse_datetime(getattr(acara, "waktu", None))
            waktu_selesai = self._parse_datetime(getattr(acara, "waktu_selesai", None))

            if waktu_mulai:
                now = datetime.now(waktu_mulai.tzinfo) if waktu_mulai.tzinfo else datetime.now()
                if now < waktu_mulai:
                    return ServiceResult({"message": "Acara tidak sedang berlangsung"}, 403)

            if waktu_selesai:
                now = datetime.now(waktu_selesai.tzinfo) if waktu_selesai.tzinfo else datetime.now()
                if now > waktu_selesai:
                    return ServiceResult({"message": "Acara tidak sedang berlangsung"}, 403)
        else:
            status = self.repository.acara_status(acara_id)
            if not status or str(status).lower() != "aktif":
                return ServiceResult({"message": "Acara tidak sedang berlangsung"}, 403)
            waktu_selesai = None
            acara = None  # fallback: tidak ada objek acara lengkap

        # ── Validasi Geofence (STRICT) ─────────────────────────────────────────
        # Ambil konfigurasi geo dari objek acara (jika tersedia)
        geo_lat  = getattr(acara, "geo_latitude",  None) if acara else None
        geo_lon  = getattr(acara, "geo_longitude", None) if acara else None
        geo_r    = getattr(acara, "geo_radius",    None) if acara else None
        geo_tol  = getattr(acara, "geo_toleransi", None) if acara else None

        if geo_lat is not None and geo_lon is not None and geo_r is not None:
            # Geofence aktif — GPS dari user wajib ada
            if data.latitude is None or data.longitude is None:
                return ServiceResult(
                    {"message": "Vote hanya bisa dilakukan di lokasi acara. Aktifkan GPS di browser Anda."},
                    403,
                )

            # Cek akurasi GPS (tolak jika > threshold → sinyal buruk / potensi fake GPS)
            if data.accuracy is None or data.accuracy > _MAX_GPS_ACCURACY:
                return ServiceResult(
                    {"message": "Sinyal GPS tidak akurat. Pastikan GPS aktif dan coba di area terbuka."},
                    403,
                )

            # Hitung jarak user ke titik pusat acara
            jarak = _haversine_distance(data.latitude, data.longitude, geo_lat, geo_lon)
            batas_maks = geo_r + (geo_tol if geo_tol is not None else _DEFAULT_TOLERANSI)

            if jarak > batas_maks:
                return ServiceResult(
                    {
                        "message": (
                            f"Anda berada {round(jarak)} meter dari lokasi acara. "
                            f"Batas maksimum: {batas_maks} meter."
                        )
                    },
                    403,
                )
        # ── End Validasi Geofence ──────────────────────────────────────────────

        if waktu_selesai:
            token = create_guest_token(data.nama, "Pengguna", [], expire=waktu_selesai)
        else:
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
            # UTF-8 BOM — diperlukan agar Excel Windows (regional Indonesia)
            # otomatis memisah kolom dan tidak menumpuk semua di Kolom A
            output.write("\ufeff")

            writer = csv.writer(output)
            writer.writerow(["No", "Nama Lengkap", "NIM", "Program Studi / Instansi", "Karya yang Dipilih", "Waktu Vote"])

            for i, row in enumerate(rows, start=1):
                nama = (row.nama or "").strip().title()
                nim_raw = (row.nim or "").strip()
                prodi = (row.prodi_instansi or "").strip()
                karya = (row.karya_nama or "").strip()

                # Proteksi NIM berawalan 0 — tanpa ini Excel memotong leading zero
                # (mis. "012324039" → 12324039). Formula teks memaksa Excel baca as-is.
                nim = f'="{nim_raw}"' if nim_raw.startswith("0") else nim_raw

                # Kolom Waktu Vote diisi '-' karena model Responden belum menyimpan timestamp
                writer.writerow([i, nama, nim, prodi, karya, "-"])

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
