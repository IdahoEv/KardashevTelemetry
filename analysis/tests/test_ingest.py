import json
import shutil
from pathlib import Path

import pytest

from kardashev_analysis.ingest import ingest

FIXTURES = Path(__file__).parent / "fixtures"
NORMAL_ID = "11111111-0000-4000-8000-000000000001"


@pytest.fixture
def dirs(tmp_path):
    raw, sessions = tmp_path / "raw", tmp_path / "sessions"
    raw.mkdir()
    return raw, sessions


def put(raw, fixture, name):
    shutil.copy(FIXTURES / fixture, raw / name)


def lines(path):
    return [json.loads(line) for line in path.read_text().splitlines()]


def test_keeps_largest_copy_per_session(dirs):
    raw, sessions = dirs
    put(raw, "session_normal_early.jsonl", "200_1.jsonl")
    put(raw, "session_normal.jsonl", "100_1.jsonl")
    report = ingest(raw, sessions)
    assert report.written == 1
    out = lines(sessions / f"{NORMAL_ID}.jsonl")
    assert len(out) == len(lines(FIXTURES / "session_normal.jsonl"))


def test_tie_goes_to_highest_message_id(dirs):
    raw, sessions = dirs
    put(raw, "session_normal.jsonl", "100_1.jsonl")
    (raw / "300_1.jsonl").write_text((FIXTURES / "session_normal.jsonl").read_text())
    ingest(raw, sessions)
    assert len(list(sessions.glob("*.jsonl"))) == 1


def test_excludes_dev_sessions_and_counts_them(dirs):
    raw, sessions = dirs
    put(raw, "session_normal.jsonl", "100_1.jsonl")
    put(raw, "session_dev.jsonl", "101_1.jsonl")
    report = ingest(raw, sessions)
    assert (report.written, report.excluded_dev) == (1, 1)
    assert [p.name for p in sessions.glob("*.jsonl")] == [f"{NORMAL_ID}.jsonl"]


def test_output_is_ordered_by_tick_then_seq(dirs):
    raw, sessions = dirs
    shuffled = lines(FIXTURES / "session_normal.jsonl")[::-1]
    (raw / "100_1.jsonl").write_text("".join(json.dumps(e) + "\n" for e in shuffled))
    ingest(raw, sessions)
    out = lines(sessions / f"{NORMAL_ID}.jsonl")
    assert [e["seq"] for e in out] == sorted(e["seq"] for e in out)


def test_skips_and_warns_on_unsupported_schema(dirs, capsys):
    raw, sessions = dirs
    events = lines(FIXTURES / "session_normal.jsonl")
    events[0]["schema_version"] = 2
    (raw / "100_1.jsonl").write_text("".join(json.dumps(e) + "\n" for e in events))
    report = ingest(raw, sessions)
    assert (report.written, report.skipped_schema) == (0, 1)
    assert "schema_version" in capsys.readouterr().err
    assert not list(sessions.glob("*.jsonl"))


def test_rerun_is_idempotent(dirs):
    raw, sessions = dirs
    put(raw, "session_normal.jsonl", "100_1.jsonl")
    ingest(raw, sessions)
    first = (sessions / f"{NORMAL_ID}.jsonl").read_text()
    ingest(raw, sessions)
    assert (sessions / f"{NORMAL_ID}.jsonl").read_text() == first
    assert not list(sessions.glob("*.tmp"))
