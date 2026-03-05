#!/bin/bash
set -e

echo "=== PaperBot Production Server ==="
echo "Starting Gunicorn on port 5000..."

exec gunicorn paperbot.wsgi:application \
  --bind 0.0.0.0:5000 \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
