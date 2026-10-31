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


def test_ingest_prints_counts(tmp_path, capsys):
    raw = tmp_path / "raw"
    raw.mkdir()
    shutil.copy(FIXTURES / "session_normal.jsonl", raw / "100_1.jsonl")
    shutil.copy(FIXTURES / "session_dev.jsonl", raw / "101_1.jsonl")
    assert cli.main(["--data-dir", str(tmp_path), "ingest"]) == 0
    out = capsys.readouterr().out
    assert "written: 1" in out
    assert "excluded (dev_session): 1" in out
    assert len(list((tmp_path / "sessions").glob("*.jsonl"))) == 1
