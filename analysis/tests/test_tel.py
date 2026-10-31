import shutil
from pathlib import Path

import pytest

from kardashev_analysis import tel

FIXTURES = Path(__file__).parent / "fixtures"
SESSION_FILES = ["session_normal.jsonl", "session_dev.jsonl", "session_stalled.jsonl"]

S1 = "11111111-0000-4000-8000-000000000001"
S2 = "11111111-0000-4000-8000-000000000002"
S3 = "11111111-0000-4000-8000-000000000003"
A1 = "00000000-0000-4000-8000-00000000a001"
A2 = "00000000-0000-4000-8000-00000000a002"
A3 = "00000000-0000-4000-8000-00000000a003"


@pytest.fixture
def sessions(tmp_path):
    for name in SESSION_FILES:
        shutil.copy(FIXTURES / name, tmp_path / name)
    return str(tmp_path / "*.jsonl")


def test_list_queries_finds_every_sql_file():
    assert tel.list_queries() == [
        "event_counts", "session_length", "stalls_per_session", "time_to_goal",
    ]


def test_time_to_goal(sessions):
    columns, rows = tel.run_query("time_to_goal", sessions)
    assert columns == ["install_id", "milestone_id", "ticked_time_s"]
    assert rows == [
        (A1, "G1", 5000.0), (A1, "G2", 12000.0),
        (A2, "G1", 2000.0),
        (A3, "G1", 4000.0),
    ]


def test_session_length(sessions):
    columns, rows = tel.run_query("session_length", sessions)
    assert columns == ["session_id", "length_s", "events"]
    assert rows == [(S1, 22.5, 15), (S2, 7.5, 5), (S3, 7.5, 5)]


def test_event_counts(sessions):
    columns, rows = tel.run_query("event_counts", sessions)
    assert columns == ["event", "count"]
    assert rows[:5] == [
        ("building_placed", 4), ("milestone_reached", 4), ("session_start", 3),
        ("building_stalled", 2), ("session_end", 2),
    ]
    assert dict(rows)["unhandled_exception"] == 1
    assert sum(count for _, count in rows) == 25


def test_stalls_per_session(sessions):
    columns, rows = tel.run_query("stalls_per_session", sessions)
    assert columns == ["session_id", "stalls"]
    assert rows == [(S1, 0), (S2, 0), (S3, 2)]


def test_unknown_query_raises(sessions):
    with pytest.raises(tel.UnknownQuery):
        tel.run_query("nope", sessions)


def test_format_table_aligns_columns():
    text = tel.format_table(["a", "bb"], [("x", 1), ("yyy", 22)])
    assert text.splitlines() == [
        "a    bb",
        "---  --",
        "x     1",
        "yyy  22",
    ]


def test_main_list(capsys):
    assert tel.main(["--list"]) == 0
    assert capsys.readouterr().out.split() == tel.list_queries()


def test_main_runs_query_as_table(sessions, capsys):
    assert tel.main(["stalls_per_session", "--sessions", sessions]) == 0
    out = capsys.readouterr().out.splitlines()
    assert out[0].split() == ["session_id", "stalls"]
    assert out[-1].split() == [S3, "2"]


def test_main_unknown_query_exits_2(capsys):
    assert tel.main(["nope"]) == 2
    assert "nope" in capsys.readouterr().err
