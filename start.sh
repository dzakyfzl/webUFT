#!/bin/bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "$0")" && pwd)"
usage() {
  cat <<'EOF'
Penggunaan:
  ./start.sh                Development: http://localhost:3000/admin/login
  ./start.sh --uat          UAT sementara: http://localhost:3200/admin/login
  ./start.sh --uat --check  Uji browser UAT dan rollback, lalu keluar
  ./start.sh --help         Tampilkan bantuan
EOF
}

if [[ "${1:-}" == "--help" && "$#" -eq 1 ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--uat" ]]; then
  shift
  if [[ "$#" -gt 1 || ( "$#" -eq 1 && "$1" != "--check" ) ]]; then
    usage >&2
    exit 2
  fi
  if [[ ! -x "$project_root/Backend/.venv/bin/python" ]]; then
    echo "Dependensi belum tersedia. Ikuti Docs/implementation/RUNBOOK.md." >&2
    exit 1
  fi
  exec "$project_root/Backend/.venv/bin/python" "$project_root/Backend/scripts/uat_session.py" "$@"
fi

if [[ "$#" -ne 0 ]]; then
  usage >&2
  exit 2
fi

if [[ ! -x "$project_root/Backend/.venv/bin/uvicorn" || ! -f "$project_root/frontend/node_modules/next/dist/bin/next" ]]; then
  echo "Dependensi belum tersedia. Ikuti Docs/implementation/RUNBOOK.md." >&2
  exit 1
fi

backend_pid=""
frontend_pid=""
cleanup() {
  trap - EXIT INT TERM
  [[ -z "$frontend_pid" ]] || kill "$frontend_pid" 2>/dev/null || true
  [[ -z "$backend_pid" ]] || kill "$backend_pid" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "Development: http://localhost:3000/admin/login"
echo "Untuk sesi UAT sementara gunakan: ./start.sh --uat"

(
  cd "$project_root/Backend"
  exec .venv/bin/uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000 --workers 1
) &
backend_pid=$!
(
  cd "$project_root/frontend"
  exec node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000
) &
frontend_pid=$!
wait -n "$backend_pid" "$frontend_pid"
