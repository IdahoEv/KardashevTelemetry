from kardashev_collector.signing import GcsPolicySigner


class FakeBlob:
    def __init__(self, bucket, name):
        self.bucket, self.name = bucket, name


class FakeBucket:
    def __init__(self):
        self.calls = []

    def blob(self, name):
        return FakeBlob(self, name)


class FakeClient:
    def __init__(self):
        self.bucket_obj = FakeBucket()
        self.calls = []

    def bucket(self, name):
        self.bucket_obj.name = name
        return self.bucket_obj

    def generate_signed_post_policy_v4(self, bucket_name, blob_name, **kwargs):
        self.calls.append((bucket_name, blob_name, kwargs))
        return {"url": "https://storage.googleapis.com/bkt/", "fields": {"key": blob_name}}


def test_signs_policy_with_size_range_expiry_and_content_type():
    client = FakeClient()
    signer = GcsPolicySigner("bkt", client=client)
    policy = signer.sign("a/b.jsonl", max_bytes=100, expires_in_s=600)

    assert policy == {"url": "https://storage.googleapis.com/bkt/", "fields": {"key": "a/b.jsonl"}}
    bucket, blob, kwargs = client.calls[0]
    assert (bucket, blob) == ("bkt", "a/b.jsonl")
    assert kwargs["expiration"] == 600
    assert kwargs["fields"] == {"Content-Type": "application/x-ndjson"}
    assert ["content-length-range", 1, 100] in kwargs["conditions"]
    assert ["eq", "$Content-Type", "application/x-ndjson"] in kwargs["conditions"]
