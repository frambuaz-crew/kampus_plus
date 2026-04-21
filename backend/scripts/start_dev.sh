#!/usr/bin/env bash

set -euo pipefail

mkdir -p data

echo "[START] Running Alembic migrations..."
python -m alembic upgrade head

echo "[START] Running normalized Konya seed..."
python scripts/seed_konya_normalized.py

echo "[START] Ensuring initial test data..."
python -m scripts.ensure_initial_data

echo "[START] Launching FastAPI..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
