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
