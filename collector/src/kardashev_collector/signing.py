from typing import Protocol

CONTENT_TYPE = "application/x-ndjson"


class PolicySigner(Protocol):
    def sign(self, key: str, max_bytes: int, expires_in_s: int) -> dict: ...


class GcsPolicySigner:
    def __init__(self, bucket_name, client=None):
        if client is None:
            from google.cloud import storage

            client = storage.Client()
        self._bucket_name = bucket_name
        self._client = client

    def sign(self, key, max_bytes, expires_in_s):
        return self._client.generate_signed_post_policy_v4(
            self._bucket_name,
            key,
            expiration=expires_in_s,
            fields={"Content-Type": CONTENT_TYPE},
            conditions=[
                ["content-length-range", 1, max_bytes],
                ["eq", "$Content-Type", CONTENT_TYPE],
            ],
        )
