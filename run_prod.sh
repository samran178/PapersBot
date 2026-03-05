#!/bin/bash
set -e

echo "=== PaperBot Production Startup ==="

echo "[1/3] Running pre-migration safety check..."
python pre_migrate.py

echo "[2/3] Applying database migrations..."
python manage.py migrate --no-input

echo "[3/3] Starting production server..."
exec gunicorn paperbot.wsgi:application \
  --bind 0.0.0.0:5000 \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
