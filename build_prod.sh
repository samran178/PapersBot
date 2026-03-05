#!/bin/bash
set -e

echo "=== PaperBot Production Build ==="

echo "[1/3] Building React frontend..."
npm run build

echo "[2/3] Creating any missing migrations..."
python manage.py makemigrations api --no-input

echo "[3/3] Applying database migrations..."
python pre_migrate.py
python manage.py migrate --fake-initial --no-input

echo "Build complete."
