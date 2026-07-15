#!/bin/bash

# Fungsi untuk mematikan proses saat dihentikan
cleanup() {
    echo ""
    echo "Mematikan server..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Trap sinyal SIGINT (Ctrl+C) dan SIGTERM
trap cleanup SIGINT SIGTERM EXIT

# 1. Jalankan Backend (FastAPI)
echo "[1/2] Menjalankan Backend (FastAPI) di port 8000..."
cd Backend || exit 1
# Pastikan menggunakan virtual environment jika ada, jika tidak akan memakai global python
# python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
cd ..

# Tunggu sejenak agar backend mulai
sleep 2

# 2. Jalankan Frontend (Next.js)
echo "[2/2] Menjalankan Frontend (Next.js) di port 3000..."
cd frontend || exit 1
# npm install
npm run dev &
FRONTEND_PID=$!
cd ..

# Tunggu sampai salah satu atau kedua proses dihentikan (foreground)
wait $BACKEND_PID $FRONTEND_PID
