import base64
import hashlib
import hmac
from collections.abc import Mapping


def _digest(install_id, secret):
    mac = hmac.new(secret, install_id.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac).rstrip(b"=").decode()


def mint_token(install_id, version, secret):
    return f"v{version}.{_digest(install_id, secret)}"


def verify_token(token, install_id, secrets: Mapping[int, bytes]):
    prefix, dot, digest = token.partition(".")
    if not dot or not prefix.startswith("v") or not prefix[1:].isascii() or not prefix[1:].isdigit() or len(prefix) > 7:
        return False
    secret = secrets.get(int(prefix[1:]))
    if secret is None:
        return False
    return hmac.compare_digest(digest.encode(), _digest(install_id, secret).encode())
