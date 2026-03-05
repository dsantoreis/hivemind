from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from fastapi import Header, HTTPException

from .config import settings


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def mint_jwt(subject: str, ttl_seconds: int = 3600) -> str:
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url(
        json.dumps({"sub": subject, "exp": int(time.time()) + ttl_seconds}).encode()
    )
    message = f"{header}.{payload}".encode()
    signature = hmac.new(settings.jwt_secret.encode(), message, hashlib.sha256).digest()
    return f"{header}.{payload}.{_b64url(signature)}"


def verify_jwt(token: str) -> dict:
    try:
        header, payload, signature = token.split(".")
        message = f"{header}.{payload}".encode()
        expected = hmac.new(settings.jwt_secret.encode(), message, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64url_decode(signature)):
            raise ValueError("invalid signature")
        claims = json.loads(_b64url_decode(payload).decode())
        if int(claims["exp"]) < int(time.time()):
            raise ValueError("expired")
        return claims
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="invalid_token") from exc


def require_auth(
    x_api_key: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> str:
    if x_api_key and hmac.compare_digest(x_api_key, settings.api_key):
        return "api_key"

    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        verify_jwt(token)
        return "jwt"

    raise HTTPException(status_code=401, detail="unauthorized")
