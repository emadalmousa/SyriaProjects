# Project Platform — MVP

Monorepo mit Next.js Frontend, FastAPI Backend und PostgreSQL.

## Schnellstart

### Lokal (ohne Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=src uvicorn app.main:app --reload
```

Datenbank initialisieren (einmalig):
```bash
cd backend
PYTHONPATH=src python -m app.init_db
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Mit Docker

```bash
docker compose up --build
```

| Dienst | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## Tests

**Backend:**
```bash
cd backend
PYTHONPATH=src pytest src/test
```

**Frontend:**
```bash
cd frontend
npm test
```

## Projektstatus-Workflow

IDEA -> UNDER_REVIEW -> FINANCIAL_PLAN_REQUIRED -> FINANCIAL_PLAN_PAID
     -> FINANCIAL_PLAN_DONE -> APPROVED -> INTEREST_RECEIVED -> CONTRACT
     -> ACTIVE -> SOLD / PAUSED / REJECTED

## Rollen: ADMIN, MANAGEMENT, PROJECT_OWNER, SUPPORTER, INVESTOR

## Umgebungsvariablen

**Backend** (backend/.env):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/appdb
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Frontend** (frontend/.env.local):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
