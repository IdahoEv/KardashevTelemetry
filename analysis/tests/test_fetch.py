import json

import pytest

from kardashev_analysis.discord_client import DiscordClient, DiscordError
from kardashev_analysis.fetch import fetch


class FakeClient:
    def __init__(self, messages, files):
        self.messages = messages
        self.files = files
        self.after_calls = []
        self.downloads = []

    def list_messages(self, channel_id, after=None):
        self.after_calls.append(after)
        floor = int(after or 0)
        yield from (m for m in self.messages if int(m["id"]) > floor)

    def download(self, url):
        self.downloads.append(url)
        return self.files[url]


def msg(mid, *attachments):
    return {
        "id": str(mid),
        "attachments": [
            {"id": str(aid), "filename": name, "url": f"https://cdn/{mid}/{aid}"}
            for aid, name in attachments
        ],
    }


def test_saves_jsonl_attachments_named_by_message_and_attachment_id(tmp_path):
    client = FakeClient([msg(100, (7, "session_a.jsonl"))], {"https://cdn/100/7": b"{}\n"})
    result = fetch(client, "chan", tmp_path)
    assert (tmp_path / "100_7.jsonl").read_bytes() == b"{}\n"
    assert result.fetched == 1


def test_ignores_non_jsonl_attachments(tmp_path):
    client = FakeClient([msg(100, (7, "photo.png"))], {})
    assert fetch(client, "chan", tmp_path).fetched == 0
    assert client.downloads == []


def test_second_run_skips_already_fetched_messages(tmp_path):
    client = FakeClient([msg(100, (7, "a.jsonl"))], {"https://cdn/100/7": b"{}\n"})
    fetch(client, "chan", tmp_path)
    again = fetch(client, "chan", tmp_path)
    assert again.fetched == 0
    assert client.downloads == ["https://cdn/100/7"]
    assert client.after_calls[-1] == "99"


def test_picks_up_only_new_messages(tmp_path):
    files = {"https://cdn/100/7": b"a\n", "https://cdn/200/8": b"b\n"}
    messages = [msg(100, (7, "a.jsonl"))]
    client = FakeClient(messages, files)
    fetch(client, "chan", tmp_path)
    messages.append(msg(200, (8, "b.jsonl")))
    assert fetch(client, "chan", tmp_path).fetched == 1
    assert (tmp_path / "200_8.jsonl").exists()


def test_does_not_redownload_a_file_already_on_disk(tmp_path):
    (tmp_path / "100_7.jsonl").write_bytes(b"old\n")
    client = FakeClient([msg(100, (7, "a.jsonl"))], {})
    client.list_messages = lambda channel_id, after=None: iter(client.messages)
    fetch(client, "chan", tmp_path)
    assert client.downloads == []
    assert (tmp_path / "100_7.jsonl").read_bytes() == b"old\n"


def test_failed_download_midway_through_a_message_is_retried_next_run(tmp_path):
    files = {"https://cdn/100/7": b"a\n"}
    client = FakeClient([msg(100, (7, "a.jsonl"), (8, "b.jsonl"))], files)
    with pytest.raises(KeyError):
        fetch(client, "chan", tmp_path)
    files["https://cdn/100/8"] = b"b\n"
    fetch(client, "chan", tmp_path)
    assert (tmp_path / "100_8.jsonl").read_bytes() == b"b\n"


class FakeHttp:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def __call__(self, url, headers):
        self.calls.append((url, headers))
        return self.responses.pop(0)


def page(*ids):
    return (200, {}, json.dumps([{"id": str(i), "attachments": []} for i in ids]).encode())


def test_list_messages_pages_forward_with_auth_header():
    http = FakeHttp([page(2, 1), page(3)])
    client = DiscordClient("tok", http=http, page_size=2, sleep=lambda s: None)
    ids = [m["id"] for m in client.list_messages("chan", after="0")]
    assert ids == ["1", "2", "3"]
    assert http.calls[0][1]["Authorization"] == "Bot tok"
    assert http.calls[0][1]["User-Agent"].startswith("KardashevTelemetry/")
    assert "after=2" in http.calls[1][0]


def test_list_messages_yields_oldest_first_when_api_pages_newest_first():
    http = FakeHttp([page(2, 1), page(3)])
    client = DiscordClient("tok", http=http, page_size=2, sleep=lambda s: None)
    assert [m["id"] for m in client.list_messages("chan")] == ["1", "2", "3"]


def test_retries_after_429_using_retry_after():
    slept = []
    http = FakeHttp([(429, {"Retry-After": "2"}, b"{}"), page(1)])
    client = DiscordClient("tok", http=http, sleep=slept.append, page_size=5)
    assert [m["id"] for m in client.list_messages("chan")] == ["1"]
    assert slept == [2.0]


def test_retry_after_lookup_is_case_insensitive():
    slept = []
    http = FakeHttp([(429, {"retry-after": "3"}, b"{}"), page(1)])
    client = DiscordClient("tok", http=http, sleep=slept.append, page_size=5)
    list(client.list_messages("chan"))
    assert slept == [3.0]


def test_error_status_raises_without_leaking_token():
    http = FakeHttp([(403, {}, b'{"message": "Missing Access"}')])
    client = DiscordClient("secret-tok", http=http)
    with pytest.raises(DiscordError) as exc:
        list(client.list_messages("chan"))
    assert "secret-tok" not in str(exc.value)
    assert "403" in str(exc.value)


def test_download_sends_no_auth_header():
    http = FakeHttp([(200, {}, b"data")])
    client = DiscordClient("tok", http=http)
    assert client.download("https://cdn/x") == b"data"
    assert "Authorization" not in http.calls[0][1]
