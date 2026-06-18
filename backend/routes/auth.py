"""Google OAuth login flow for the single allowed user."""
import os

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse

from services.auth import (
    COOKIE_MAX_AGE,
    COOKIE_NAME,
    allowed_email,
    issue_session,
    require_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Where the SPA lives (also used to build the OAuth redirect URI).
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173").rstrip("/")
REDIRECT_URI = f"{APP_BASE_URL}/api/auth/callback"

oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/login")
async def login(request: Request):
    return await oauth.google.authorize_redirect(request, REDIRECT_URI)


@router.get("/callback", name="auth_callback")
async def callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError:
        raise HTTPException(401, "Google sign-in failed")

    userinfo = token.get("userinfo") or {}
    email = (userinfo.get("email") or "").strip().lower()
    if not userinfo.get("email_verified", False) or email != allowed_email():
        # Authenticated with Google, but not the allowed account.
        raise HTTPException(403, "This account is not authorized")

    resp = RedirectResponse(url=f"{APP_BASE_URL}/", status_code=302)
    resp.set_cookie(
        COOKIE_NAME,
        issue_session(email),
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    return resp


@router.get("/me")
async def me(email: str = Depends(require_user)):
    return {"email": email}


@router.post("/logout")
async def logout():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(COOKIE_NAME, path="/")
    return resp
