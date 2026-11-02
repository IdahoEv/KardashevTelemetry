import shutil
from pathlib import Path

from kardashev_analysis import cli

FIXTURES = Path(__file__).parent / "fixtures"


def test_fetch_without_token_exits_nonzero(tmp_path, monkeypatch, capsys):
    monkeypatch.delenv("DISCORD_BOT_TOKEN", raising=False)
    monkeypatch.setenv("DISCORD_CHANNEL_ID", "1")
    assert cli.main(["--data-dir", str(tmp_path), "fetch"]) == 2
    assert "DISCORD_BOT_TOKEN" in capsys.readouterr().err


def test_fetch_without_channel_exits_nonzero(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("DISCORD_BOT_TOKEN", "t")
    monkeypatch.delenv("DISCORD_CHANNEL_ID", raising=False)
    assert cli.main(["--data-dir", str(tmp_path), "fetch"]) == 2
    assert "DISCORD_CHANNEL_ID" in capsys.readouterr().err


def _capture_serve(monkeypatch):
    calls = {}
    monkeypatch.setattr(cli.uvicorn, "run", lambda app, host, port: calls.update(app=app, host=host, port=port))
    return calls


def test_serve_defaults_to_loopback_8000(monkeypatch):
    calls = _capture_serve(monkeypatch)
    assert cli.main(["serve"]) == 0
    assert (calls["host"], calls["port"]) == ("127.0.0.1", 8000)


def test_serve_flags_override(tmp_path, monkeypatch):
    calls = _capture_serve(monkeypatch)
    assert cli.main(["serve", "--host", "0.0.0.0", "--port", "9001", "--data-dir", str(tmp_path)]) == 0
    assert (calls["host"], calls["port"]) == ("0.0.0.0", 9001)


def test_serve_uses_data_dir_given_after_subcommand(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    calls = _capture_serve(monkeypatch)
    (tmp_path / "sessions").mkdir()
    shutil.copy(FIXTURES / "session_normal.jsonl", tmp_path / "sessions" / "a.jsonl")
    cli.main(["serve", "--data-dir", str(tmp_path)])
    assert TestClient(calls["app"]).get("/api/health").json()["session_count"] == 1


def test_serve_uses_top_level_data_dir(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    calls = _capture_serve(monkeypatch)
    cli.main(["--data-dir", str(tmp_path), "serve"])
    assert TestClient(calls["app"]).get("/api/health").json()["session_count"] == 0


def test_serve_serves_the_dashboard_dist(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    calls = _capture_serve(monkeypatch)
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<html>dash</html>")
    monkeypatch.setattr(cli, "DASHBOARD_DIST", dist)
    cli.main(["--data-dir", str(tmp_path), "serve"])
    assert "dash" in TestClient(calls["app"]).get("/").text


def test_ingest_prints_counts(tmp_path, capsys):
    raw = tmp_path / "raw"
    raw.mkdir()
    shutil.copy(FIXTURES / "session_normal.jsonl", raw / "100_1.jsonl")
    shutil.copy(FIXTURES / "session_dev.jsonl", raw / "101_1.jsonl")
    assert cli.main(["--data-dir", str(tmp_path), "ingest"]) == 0
    out = capsys.readouterr().out
    assert "written: 1" in out
    assert "written (dev): 1" in out
    assert len(list((tmp_path / "sessions").glob("*.jsonl"))) == 1
    assert len(list((tmp_path / "dev_sessions").glob("*.jsonl"))) == 1
