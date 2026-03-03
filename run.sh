#!/bin/bash
set -e

echo "=== PaperBot Django Backend ==="

echo "[1/4] Building React frontend..."
npm run build

echo "[2/4] Creating Django migrations..."
python manage.py makemigrations api --no-input

echo "[3/4] Applying migrations..."
python manage.py migrate --fake-initial --no-input

echo "[4/4] Starting Django server on port 5000..."
exec python manage.py runserver 0.0.0.0:5000
