import re

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.core.config import settings
from app.routers import auth, projects, uploads, users

app = FastAPI(title="Project Platform API", version="0.1.0")


def is_allowed_origin(origin: str) -> bool:
    if origin in settings.cors_origins:
        return True
    # Allow all Vercel preview deployments for this project
    if re.match(r"https://syriaprojects-frontend[a-z0-9\-]*\.vercel\.app$", origin):
        return True
    return False


@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    if request.method == "OPTIONS" and origin:
        if is_allowed_origin(origin):
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            )
    response = await call_next(request)
    if origin and is_allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

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
