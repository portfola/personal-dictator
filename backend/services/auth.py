"""Single-user Google SSO: session issuing/verification helpers.

Auth model: after Google verifies the user and we confirm their email matches
ALLOWED_EMAIL, we mint a short signed JWT and store it in an HttpOnly cookie.
Every protected request is gated by `require_user`, which re-verifies the JWT
and the email allowlist on each call.
"""
import os
import time

import jwt
from fastapi import HTTPException, Request

COOKIE_NAME = "pd_session"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days
_ALGO = "HS256"


def _session_secret() -> str:
    secret = os.getenv("SESSION_SECRET")
    if not secret:
        raise HTTPException(500, "SESSION_SECRET is not configured")
    return secret


def allowed_email() -> str:
    return (os.getenv("ALLOWED_EMAIL") or "").strip().lower()


def issue_session(email: str) -> str:
    """Mint a signed JWT for the given (already-verified) email."""
    now = int(time.time())
    payload = {"sub": email, "iat": now, "exp": now + COOKIE_MAX_AGE}
    return jwt.encode(payload, _session_secret(), algorithm=_ALGO)


def require_user(request: Request) -> str:
    """FastAPI dependency: return the signed-in email or raise 401/403."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, _session_secret(), algorithms=[_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired session")

    email = (payload.get("sub") or "").strip().lower()
    if not email or email != allowed_email():
        raise HTTPException(403, "Not authorized")
    return email
