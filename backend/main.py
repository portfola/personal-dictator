import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from starlette.middleware.sessions import SessionMiddleware

from starlette.requests import Request

from routes.library import router as library_router
from routes.actions import router as actions_router
from routes.auth import router as auth_router
from routes.voices import router as voices_router
from services.auth import require_user

APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173").rstrip("/")

app = FastAPI(title="Personal Dictator API")

# API JSON responses must never be cached: without this, browsers heuristically
# cache GET /api/library and serve a stale (e.g. just-deleted) list after a refresh.
# Audio is unaffected — it streams from presigned S3 URLs, not through here.
@app.middleware("http")
async def no_store_api(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response

# Holds the transient OAuth state/nonce during the Google handshake.
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "dev-insecure-secret"),
    same_site="lax",
    https_only=True,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[APP_BASE_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth routes are public; everything else requires a valid session.
app.include_router(auth_router)
app.include_router(library_router, dependencies=[Depends(require_user)])
app.include_router(actions_router, dependencies=[Depends(require_user)])
app.include_router(voices_router, dependencies=[Depends(require_user)])

@app.get("/api/health")
def health():
    return {"status": "ok"}

# Lambda entry point
handler = Mangum(app, lifespan="off")
