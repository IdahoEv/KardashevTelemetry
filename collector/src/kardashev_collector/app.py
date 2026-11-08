import logging

from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field

from kardashev_collector.keys import ID_PATTERN, object_key
from kardashev_collector.ratelimit import FixedWindowLimiter
from kardashev_collector.tokens import mint_token, verify_token

logger = logging.getLogger(__name__)


class RegisterRequest(BaseModel):
    install_id: str = Field(pattern=ID_PATTERN)


class UploadPolicyRequest(RegisterRequest):
    session_id: str = Field(pattern=ID_PATTERN)


def client_ip(request: Request):
    # Cloud Run's frontend appends the real peer as the second-from-right entry; the left side is client-supplied.
    forwarded = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
    if len(forwarded) >= 2:
        return forwarded[-2]
    return request.client.host if request.client else "unknown"


def bearer_token(authorization):
    scheme, _, token = (authorization or "").partition(" ")
    return token if scheme.lower() == "bearer" else ""


def create_app(settings, signer, upload_limiter=None, register_limiter=None):
    upload_limiter = upload_limiter or FixedWindowLimiter(limit=60, window_s=60)
    register_limiter = register_limiter or FixedWindowLimiter(limit=10, window_s=60)
    app = FastAPI()

    def refuse_revoked(install_id):
        if install_id in settings.revoked:
            raise HTTPException(status_code=403, detail="install revoked")

    @app.post("/register")
    def register(body: RegisterRequest, request: Request):
        if not register_limiter.allow(client_ip(request)):
            raise HTTPException(status_code=429, detail="rate limited")
        refuse_revoked(body.install_id)
        secret = settings.secrets[settings.current_version]
        return {"token": mint_token(body.install_id, settings.current_version, secret)}

    @app.post("/upload-policy")
    def upload_policy(body: UploadPolicyRequest, authorization: str | None = Header(None)):
        if not verify_token(bearer_token(authorization), body.install_id, settings.secrets):
            raise HTTPException(status_code=401, detail="invalid token")
        refuse_revoked(body.install_id)
        if not upload_limiter.allow(body.install_id):
            raise HTTPException(status_code=429, detail="rate limited")
        key = object_key(body.install_id, body.session_id)
        try:
            return signer.sign(key, settings.max_upload_bytes, settings.policy_expiry_s)
        except Exception:
            logger.exception("policy signing failed")
            raise HTTPException(status_code=503, detail="signing unavailable")

    return app
