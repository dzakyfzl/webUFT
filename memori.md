# Memori Proyek

## 2026-07-15 — Migrasi dependency backend ke uv

- Dependency backend didefinisikan melalui `Backend/pyproject.toml` dan dikunci dalam `Backend/uv.lock`.
- Pengembangan lokal menjalankan backend dengan `uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000`.
- Image backend memasang dependency dengan `uv sync --locked` dan menjalankan Uvicorn melalui `uv run --no-sync`.
- `Backend/requirements.txt` tidak lagi digunakan.

## 2026-07-15 — Health check backend

- Backend menyediakan endpoint liveness `GET /health` dengan respons `{ "status": "healthy" }`.
- Service `backend` di Docker Compose memeriksa endpoint tersebut melalui Python standard library.
- Service `frontend` menunggu status backend sehat melalui `depends_on: condition: service_healthy`.

## 2026-07-22 — Refactor backend layered architecture

- Backend sekarang menggunakan paket `Backend/app` dengan alur `routers -> services -> repositories -> models`; `app/core` menampung database/auth dan `app/utils` menampung image processing.
- Pemetaan utama: `Database/database.py -> app/core/database.py`, `Database/models.py -> app/models/entities.py`, `Router/*.py -> app/routers/*.py`, schema inline -> `app/schemas`, query -> `app/repositories`, dan business logic -> `app/services`.
- Folder legacy `Backend/Database`, `Backend/Router`, dan `Backend/Feature` telah dihapus tanpa compatibility wrapper.
- Kontrak OpenAPI sebelum dan sesudah refactor identik: 39 path/operation dan schema request yang sama; hash characterization disimpan di `Backend/tests/fixtures/openapi_contract.sha256`.
- Dependency development `pytest` dan `httpx` didefinisikan melalui dependency group `dev`; validasi final: `uv lock --check`, `uv run --group dev pytest -q` (12 passed), `python -m compileall -q app main.py`, dan `docker compose config --quiet`.
- Uvicorn berhasil mencapai `Application startup complete` dengan SQLite smoke database. HTTP loopback dari sandbox tidak dapat tersambung, sehingga request jaringan live tidak diklaim tervalidasi; fungsi health tetap menghasilkan `{ "status": "healthy" }`.
- Defect baseline sengaja tidak diperbaiki: referensi legacy `Jawaban`/`Pertanyaan` saat hapus acara, field `status` yang tidak ada saat membuat album, helper penghapusan file tanpa model `File`, serta kegagalan penghapusan token refresh kedaluwarsa.
