import pytest
from fastapi.testclient import TestClient

from kardashev_collector.app import create_app
from kardashev_collector.config import Settings
from kardashev_collector.ratelimit import FixedWindowLimiter
from kardashev_collector.tokens import mint_token

REG_KEY = "reg-key-1"
INSTALL = "00000000-0000-4000-8000-00000000a001"
SESSION = "11111111-0000-4000-8000-000000000001"


class FakeSigner:
    def __init__(self):
        self.calls = []

    def sign(self, key, max_bytes, expires_in_s):
        self.calls.append((key, max_bytes, expires_in_s))
        return {"url": "https://gcs.example/bkt/", "fields": {"key": key}}


def make_settings(**over):
    values = dict(
        secrets={1: b"old", 2: b"new"},
        bucket="bkt",
        max_upload_bytes=1000,
        policy_expiry_s=600,
        revoked=frozenset(),
        registration_keys=frozenset({REG_KEY.encode()}),
    )
    values.update(over)
    return Settings(**values)


@pytest.fixture
def signer():
    return FakeSigner()


def make_client(signer, settings=None, upload_limit=100, register_limit=100, registration_key=REG_KEY):
    app = create_app(
        settings or make_settings(),
        signer,
        upload_limiter=FixedWindowLimiter(upload_limit, 60),
        register_limiter=FixedWindowLimiter(register_limit, 60),
    )
    headers = {"X-Registration-Key": registration_key} if registration_key else {}
    return TestClient(app, headers=headers)


def auth(install=INSTALL, version=2, secret=b"new"):
    return {"Authorization": f"Bearer {mint_token(install, version, secret)}"}


def policy_body(install=INSTALL, session=SESSION):
    return {"install_id": install, "session_id": session}


def test_register_returns_token_that_upload_accepts(signer):
    client = make_client(signer)
    res = client.post("/register", json={"install_id": INSTALL})
    assert res.status_code == 200
    token = res.json()["token"]
    assert token == mint_token(INSTALL, 2, b"new")

    res = client.post("/upload-policy", json=policy_body(), headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200


def test_register_is_idempotent(signer):
    client = make_client(signer)
    first = client.post("/register", json={"install_id": INSTALL}).json()
    second = client.post("/register", json={"install_id": INSTALL}).json()
    assert first == second


def test_register_rejects_malformed_id(signer):
    assert make_client(signer).post("/register", json={"install_id": "nope"}).status_code == 422


def test_register_rate_limited_per_ip(signer):
    client = make_client(signer, register_limit=1)
    assert client.post("/register", json={"install_id": INSTALL}).status_code == 200
    assert client.post("/register", json={"install_id": INSTALL}).status_code == 429


def test_register_uses_trusted_forwarded_ip(signer):
    client = make_client(signer, register_limit=1)

    def post(forwarded):
        return client.post("/register", json={"install_id": INSTALL}, headers={"X-Forwarded-For": forwarded}).status_code

    assert post("spoofed-1, 1.1.1.1, 10.0.0.1") == 200
    assert post("spoofed-2, 1.1.1.1, 10.0.0.1") == 429
    assert post("spoofed-2, 2.2.2.2, 10.0.0.1") == 200


def test_register_refuses_revoked_install(signer):
    client = make_client(signer, make_settings(revoked=frozenset({INSTALL})))
    assert client.post("/register", json={"install_id": INSTALL}).status_code == 403


def test_upload_policy_returns_signed_policy_for_key(signer):
    res = make_client(signer).post("/upload-policy", json=policy_body(), headers=auth())
    assert res.status_code == 200
    assert res.json() == {"url": "https://gcs.example/bkt/", "fields": {"key": f"{INSTALL}/{SESSION}.jsonl"}}
    assert signer.calls == [(f"{INSTALL}/{SESSION}.jsonl", 1000, 600)]


def test_upload_policy_accepts_previous_secret_version(signer):
    res = make_client(signer).post("/upload-policy", json=policy_body(), headers=auth(version=1, secret=b"old"))
    assert res.status_code == 200


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer garbage"},
        {"Authorization": "Basic abc"},
        {"Authorization": ""},
        auth(install="00000000-0000-4000-8000-00000000a002"),
        auth(secret=b"wrong"),
    ],
)
def test_upload_policy_rejects_bad_or_missing_token(signer, headers):
    res = make_client(signer).post("/upload-policy", json=policy_body(), headers=headers)
    assert res.status_code == 401
    assert signer.calls == []


@pytest.mark.parametrize(
    "body",
    [
        {"install_id": "x", "session_id": SESSION},
        {"install_id": INSTALL, "session_id": "../etc"},
        {"install_id": INSTALL},
        {},
    ],
)
def test_upload_policy_rejects_malformed_ids(signer, body):
    res = make_client(signer).post("/upload-policy", json=body, headers=auth())
    assert res.status_code == 422
    assert signer.calls == []


def test_upload_policy_rate_limited_per_install(signer):
    client = make_client(signer, upload_limit=1)
    assert client.post("/upload-policy", json=policy_body(), headers=auth()).status_code == 200
    assert client.post("/upload-policy", json=policy_body(), headers=auth()).status_code == 429


def test_failed_auth_does_not_consume_install_quota(signer):
    client = make_client(signer, upload_limit=1)
    client.post("/upload-policy", json=policy_body(), headers={"Authorization": "Bearer junk"})
    assert client.post("/upload-policy", json=policy_body(), headers=auth()).status_code == 200


def test_upload_policy_returns_503_when_signing_fails(signer):
    def boom(*args):
        raise RuntimeError("iam down")

    signer.sign = boom
    client = make_client(signer)
    r = client.post("/upload-policy", json=policy_body(), headers=auth())
    assert r.status_code == 503
    assert client.post("/register", json={"install_id": INSTALL}).status_code == 200


def test_register_ip_falls_back_to_peer_without_two_forwarded_entries(signer):
    client = make_client(signer, register_limit=1)
    headers = {"X-Forwarded-For": "9.9.9.9"}
    assert client.post("/register", json={"install_id": INSTALL}, headers=headers).status_code == 200
    headers = {"X-Forwarded-For": "8.8.8.8"}
    assert client.post("/register", json={"install_id": INSTALL}, headers=headers).status_code == 429


def test_upload_policy_refuses_revoked_install(signer):
    client = make_client(signer, make_settings(revoked=frozenset({INSTALL})))
    assert client.post("/upload-policy", json=policy_body(), headers=auth()).status_code == 403
    assert signer.calls == []


@pytest.mark.parametrize("key", [None, "wrong", ""])
def test_register_rejects_bad_or_missing_registration_key(signer, key):
    client = make_client(signer, registration_key=key)
    assert client.post("/register", json={"install_id": INSTALL}).status_code == 401


def test_register_accepts_any_configured_registration_key(signer):
    settings = make_settings(registration_keys=frozenset({b"a", b"b"}))
    for key in ("a", "b"):
        client = make_client(signer, settings, registration_key=key)
        assert client.post("/register", json={"install_id": INSTALL}).status_code == 200


def test_register_with_no_keys_configured_refuses_everyone(signer):
    client = make_client(signer, make_settings(registration_keys=frozenset()))
    assert client.post("/register", json={"install_id": INSTALL}).status_code == 401


def test_bad_registration_keys_consume_ip_quota(signer):
    client = make_client(signer, register_limit=1, registration_key="wrong")
    assert client.post("/register", json={"install_id": INSTALL}).status_code == 401
    assert client.post("/register", json={"install_id": INSTALL}).status_code == 429
