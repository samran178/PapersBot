#!/bin/bash
set -e

echo "=== PaperBot Production Build ==="

echo "[1/2] Building React frontend..."
npm run build

echo "[2/2] Creating migrations..."
python manage.py makemigrations api --no-input

echo "Build complete."
