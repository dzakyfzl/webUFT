#!/bin/bash

# Fungsi untuk mematikan proses saat dihentikan
cleanup() {
    trap - SIGINT SIGTERM EXIT
    echo ""
    echo "Mematikan server..."
    if [ -n "${BACKEND_PID:-}" ]; then
        kill "$BACKEND_PID" 2>/dev/null
    fi
    if [ -n "${FRONTEND_PID:-}" ]; then
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    exit
}

# Trap sinyal SIGINT (Ctrl+C) dan SIGTERM
trap cleanup SIGINT SIGTERM EXIT

# 1. Jalankan Backend (FastAPI)
echo "[1/2] Menjalankan Backend (FastAPI) di port 8000..."
cd Backend || exit 1
uv run uvicorn main:app --env-file ../.env --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
cd ..

# Pastikan backend siap sebelum frontend dijalankan
BACKEND_READY=false
for _ in {1..15}; do
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "Backend gagal dijalankan. Periksa error FastAPI di atas."
        exit 1
    fi

    if curl --fail --silent --max-time 1 http://127.0.0.1:8000/health >/dev/null; then
        BACKEND_READY=true
        break
    fi

    sleep 1
done

if [ "$BACKEND_READY" != true ]; then
    echo "Backend tidak siap setelah 15 detik. Periksa koneksi database dan konfigurasi .env."
    exit 1
fi

# 2. Jalankan Frontend (Next.js)
echo "[2/2] Menjalankan Frontend (Next.js) di port 3000..."
cd frontend || exit 1
# npm install
npm run dev &
FRONTEND_PID=$!
cd ..

# Tunggu sampai salah satu atau kedua proses dihentikan (foreground)
wait $BACKEND_PID $FRONTEND_PID
