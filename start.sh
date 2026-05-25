#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Datenbank zurücksetzen (alle Daten löschen)
if [ "$1" = "reset" ]; then
  echo ""
  echo "  Datenbank wird zurückgesetzt..."
  echo "==================================="
  if ! pg_isready -q 2>/dev/null; then
    sudo systemctl start postgresql
    sleep 2
  fi
  cd "$ROOT/backend"
  [ ! -f "venv/bin/activate" ] && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt -q || source venv/bin/activate
  PYTHONPATH=src python -c "
from app.core.database import Base, engine
from app.models import user, project
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print('✓ Datenbank zurückgesetzt — alle Daten gelöscht.')
"
  exit 0
fi

echo ""
echo "  SyriaProjects wird gestartet..."
echo "================================="

# PostgreSQL starten falls nicht läuft
if ! pg_isready -q 2>/dev/null; then
  echo "▶ PostgreSQL wird gestartet..."
  sudo systemctl start postgresql
  sleep 2
fi
echo "✓ Datenbank läuft"

# Virtual Environment erstellen falls nicht vorhanden
cd "$ROOT/backend"
if [ ! -f "venv/bin/activate" ]; then
  echo "▶ Virtuelle Umgebung wird erstellt..."
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt -q
  echo "✓ Pakete installiert"
else
  source venv/bin/activate
fi

# Datenbank-Tabellen erstellen
PYTHONPATH=src python -m app.init_db 2>/dev/null
echo "✓ Tabellen bereit"

# Backend starten
PYTHONPATH=src uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "✓ Backend läuft  → http://localhost:8000"

# Frontend starten
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo "✓ Frontend läuft → http://localhost:3000"

echo ""
echo "  Stoppen mit Ctrl+C"
echo ""

cleanup() {
  echo ""
  echo "Wird gestoppt..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit
}

trap cleanup INT TERM

wait
