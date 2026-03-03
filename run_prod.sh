#!/bin/bash
set -e

echo "=== PaperBot Production Startup ==="

echo "[1/2] Applying database migrations..."
python manage.py migrate --fake-initial --no-input

echo "[2/2] Starting production server..."
exec gunicorn paperbot.wsgi:application \
  --bind 0.0.0.0:5000 \
  --workers 4 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
