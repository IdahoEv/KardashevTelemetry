import pytest

from kardashev_collector.config import Settings


def env(**over):
    base = {"HMAC_SECRETS": "1:old,2:new", "GCS_BUCKET": "bkt"}
    base.update(over)
    return base


def test_parses_secrets_and_current_version():
    s = Settings.from_env(env())
    assert s.secrets == {1: b"old", 2: b"new"}
    assert s.current_version == 2
    assert s.bucket == "bkt"


def test_defaults_match_design():
    s = Settings.from_env(env())
    assert s.max_upload_bytes == 10 * 1024 * 1024
    assert s.policy_expiry_s == 600
    assert s.revoked == frozenset()


def test_overrides_and_revoked_list():
    s = Settings.from_env(env(MAX_UPLOAD_BYTES="100", REVOKED_INSTALL_IDS="a, b"))
    assert s.max_upload_bytes == 100
    assert s.revoked == frozenset({"a", "b"})


@pytest.mark.parametrize("secrets", [None, "", "nocolon", "x:secret", "1:"])
def test_rejects_missing_or_bad_secrets(secrets):
    e = env()
    if secrets is None:
        del e["HMAC_SECRETS"]
    else:
        e["HMAC_SECRETS"] = secrets
    with pytest.raises(ValueError):
        Settings.from_env(e)


def test_requires_bucket():
    e = env()
    del e["GCS_BUCKET"]
    with pytest.raises(ValueError):
        Settings.from_env(e)
