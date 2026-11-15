#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
fi
if [ ! -f .venv/.kyrgyz-city-installed ]; then
  .venv/bin/python -m pip install -r requirements.txt
  touch .venv/.kyrgyz-city-installed
fi
if [ ! -f static/app/.vite/manifest.json ]; then
  (cd frontend && npm ci && npm run build)
fi
printf '\nKyrgyz City: http://127.0.0.1:8000\nStop: Ctrl+C\n\n'
exec .venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
