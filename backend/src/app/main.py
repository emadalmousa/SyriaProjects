from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, projects, uploads, users

app = FastAPI(title="Project Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(uploads.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/admin/reset-db")
def reset_db(secret: str):
    from app.core.database import Base, engine
    from app.models import user, project, token  # noqa
    if secret != settings.secret_key:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Forbidden")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return {"status": "db reset done"}
