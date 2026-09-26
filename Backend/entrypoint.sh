#!/bin/sh
set -e

echo "Running Alembic migrations..."
uv run --no-sync alembic upgrade head

echo "Starting server..."
exec uv run --no-sync uvicorn main:app --host 0.0.0.0 --port 8000
