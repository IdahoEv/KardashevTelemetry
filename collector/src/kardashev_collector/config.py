from dataclasses import dataclass


def _parse_secrets(raw):
    secrets = {}
    for part in (raw or "").split(","):
        version, sep, secret = part.strip().partition(":")
        if not sep or not version.isascii() or not version.isdigit() or not secret:
            raise ValueError("HMAC_SECRETS must be 'version:secret' pairs, comma-separated")
        secrets[int(version)] = secret.encode()
    return secrets


@dataclass(frozen=True)
class Settings:
    secrets: dict
    bucket: str
    max_upload_bytes: int = 10 * 1024 * 1024
    policy_expiry_s: int = 600
    revoked: frozenset = frozenset()

    @property
    def current_version(self):
        return max(self.secrets)

    @classmethod
    def from_env(cls, env):
        if not env.get("GCS_BUCKET"):
            raise ValueError("GCS_BUCKET is required")
        revoked = frozenset(i.strip() for i in env.get("REVOKED_INSTALL_IDS", "").split(",") if i.strip())
        return cls(
            secrets=_parse_secrets(env.get("HMAC_SECRETS")),
            bucket=env["GCS_BUCKET"],
            max_upload_bytes=int(env.get("MAX_UPLOAD_BYTES", cls.max_upload_bytes)),
            policy_expiry_s=int(env.get("POLICY_EXPIRY_S", cls.policy_expiry_s)),
            revoked=revoked,
        )
