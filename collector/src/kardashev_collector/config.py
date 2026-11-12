from dataclasses import dataclass


def _parse_secrets(raw):
    secrets = {}
    for part in (raw or "").split(","):
        version, sep, secret = part.strip().partition(":")
        if not sep or not version.isascii() or not version.isdigit() or not secret:
            raise ValueError("HMAC_SECRETS must be 'version:secret' pairs, comma-separated")
        if int(version) in secrets:
            raise ValueError(f"HMAC_SECRETS repeats version {int(version)}")
        secrets[int(version)] = secret.encode()
    return secrets


def _positive_int(env, name, default):
    value = int(env.get(name) or default)
    if value < 1:
        raise ValueError(f"{name} must be at least 1")
    return value


@dataclass(frozen=True)
class Settings:
    secrets: dict
    bucket: str
    max_upload_bytes: int = 10 * 1024 * 1024
    policy_expiry_s: int = 600
    revoked: frozenset = frozenset()
    registration_keys: frozenset = frozenset()

    @property
    def current_version(self):
        return max(self.secrets)

    @classmethod
    def from_env(cls, env):
        if not env.get("GCS_BUCKET"):
            raise ValueError("GCS_BUCKET is required")
        revoked = frozenset(i.strip() for i in env.get("REVOKED_INSTALL_IDS", "").split(",") if i.strip())
        registration_keys = frozenset(
            k.strip().encode() for k in env.get("REGISTRATION_KEYS", "").split(",") if k.strip()
        )
        if not registration_keys:
            raise ValueError("REGISTRATION_KEYS must list at least one key")
        return cls(
            secrets=_parse_secrets(env.get("HMAC_SECRETS")),
            bucket=env["GCS_BUCKET"],
            max_upload_bytes=_positive_int(env, "MAX_UPLOAD_BYTES", cls.max_upload_bytes),
            policy_expiry_s=_positive_int(env, "POLICY_EXPIRY_S", cls.policy_expiry_s),
            revoked=revoked,
            registration_keys=registration_keys,
        )
