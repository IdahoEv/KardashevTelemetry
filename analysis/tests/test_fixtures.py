import json
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"
ENVELOPE = {
    "install_id", "session_id", "build", "os", "seq", "t_ms",
    "sim_time_s", "dev_session", "event", "props",
}
ACTION_EVENTS = {
    "building_placed", "building_upgraded", "fleet_command", "ship_built",
    "ship_launched", "clock_paused", "clock_resumed", "clock_rate_changed",
    "auto_relaunch_toggled",
}


def load(name):
    lines = (FIXTURES / name).read_text().splitlines()
    return [json.loads(line) for line in lines]


@pytest.fixture(params=sorted(p.name for p in FIXTURES.glob("*.jsonl")))
def session(request):
    return load(request.param)


def test_at_least_three_fixtures():
    assert len(list(FIXTURES.glob("*.jsonl"))) >= 3


def test_envelope_fields_present(session):
    for e in session:
        assert ENVELOPE <= e.keys()
        assert e["build"].keys() == {"version", "commit"}


def test_single_session_and_install(session):
    assert len({e["session_id"] for e in session}) == 1
    assert len({e["install_id"] for e in session}) == 1


def test_seq_counts_from_one(session):
    assert [e["seq"] for e in session] == list(range(1, len(session) + 1))


def test_action_events_have_tick_stamp(session):
    for e in session:
        if e["event"] in ACTION_EVENTS:
            assert isinstance(e["props"]["tick"], int)
            assert isinstance(e["props"]["ticked_time_s"], float)


def test_player_name_only_on_session_start(session):
    for e in session:
        if e["event"] != "session_start":
            assert "player_name" not in e
            assert "player_name" not in e["props"]


def test_normal_session_is_clean_and_complete():
    events = load("session_normal.jsonl")
    assert not any(e["dev_session"] for e in events)
    assert events[0]["event"] == "session_start"
    assert "player_name" in events[0]
    assert events[-1]["event"] == "session_end"
    milestones = [e for e in events if e["event"] == "milestone_reached"]
    assert [m["props"]["milestone_id"] for m in milestones] == ["G1", "G2"]


def test_dev_session_flips_at_first_cheat():
    events = load("session_dev.jsonl")
    cheat = next(i for i, e in enumerate(events) if e["event"] == "dev_cheat_used")
    assert not any(e["dev_session"] for e in events[:cheat])
    assert all(e["dev_session"] for e in events[cheat:])


def test_early_upload_is_prefix_of_normal():
    normal = load("session_normal.jsonl")
    early = load("session_normal_early.jsonl")
    assert len(early) < len(normal)
    assert early == normal[: len(early)]
    assert "session_end" not in {e["event"] for e in early}
    assert any(e["event"] == "milestone_reached" for e in early)


def test_dev_session_is_distinct_session():
    normal = load("session_normal.jsonl")
    dev = load("session_dev.jsonl")
    assert dev[0]["session_id"] != normal[0]["session_id"]
