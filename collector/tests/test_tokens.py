from kardashev_collector.tokens import mint_token, verify_token

INSTALL = "00000000-0000-4000-8000-00000000a001"
OTHER = "00000000-0000-4000-8000-00000000a002"
SECRETS = {1: b"old-secret", 2: b"new-secret"}


def test_mint_is_versioned_and_deterministic():
    token = mint_token(INSTALL, 2, SECRETS[2])
    assert token.startswith("v2.")
    assert token == mint_token(INSTALL, 2, SECRETS[2])
    assert "=" not in token


def test_verify_accepts_current_and_previous_versions():
    assert verify_token(mint_token(INSTALL, 2, SECRETS[2]), INSTALL, SECRETS)
    assert verify_token(mint_token(INSTALL, 1, SECRETS[1]), INSTALL, SECRETS)


def test_verify_rejects_other_install():
    assert not verify_token(mint_token(INSTALL, 2, SECRETS[2]), OTHER, SECRETS)


def test_verify_rejects_unknown_version():
    assert not verify_token(mint_token(INSTALL, 3, b"x"), INSTALL, SECRETS)


def test_verify_rejects_wrong_secret():
    assert not verify_token(mint_token(INSTALL, 2, b"guess"), INSTALL, SECRETS)


def test_verify_rejects_malformed_tokens():
    for token in ["", "garbage", "v.abc", "vx.abc", "v2.", "v2", "2.abc", "v2.é"]:
        assert not verify_token(token, INSTALL, SECRETS)


def test_oversized_version_digits_are_rejected_not_raised():
    assert verify_token("v" + "9" * 5000 + ".x", "id", {1: b"s"}) is False
