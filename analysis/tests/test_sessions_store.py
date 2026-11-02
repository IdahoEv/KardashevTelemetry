from conftest import S1, S2, S3, S4

from kardashev_analysis.sessions_store import load_sessions


def _by_id(data_dir):
    return {s.session_id: s for s in load_sessions(data_dir)}


def test_missing_dirs_give_no_sessions(tmp_path):
    assert load_sessions(tmp_path) == []


def test_reads_both_directories_and_flags_dev(full_data_dir):
    sessions = _by_id(full_data_dir)
    assert set(sessions) == {S1, S2, S3, S4}
    assert {sid: s.dev for sid, s in sessions.items()} == {S1: False, S2: True, S3: False, S4: False}


def test_named_session_summary(full_data_dir):
    s = _by_id(full_data_dir)[S1]
    assert s.install_id == "00000000-0000-4000-8000-00000000a001"
    assert s.player_name == "TestPilot"
    assert (s.build_version, s.build_commit) == ("0.3.1", "abc1234")
    assert s.wall_time_s == 22.5
    assert s.goals == ["G1", "G2"]
    assert s.last_goal == "G2"
    assert s.event_count == 15
    assert s.ended is True


def test_unnamed_session_without_end(full_data_dir):
    s = _by_id(full_data_dir)[S3]
    assert s.player_name is None
    assert s.ended is False
    assert s.goals == ["G1"]


def test_old_build_without_tick_stamps(full_data_dir):
    s = _by_id(full_data_dir)[S4]
    assert (s.build_version, s.build_commit) == ("0.2.0", "7383dc8")
    assert s.goals == ["G1"]
    assert s.ended is True


def test_session_without_goals_has_null_last_goal(make_data_dir, tmp_path):
    data_dir = make_data_dir(sessions=["session_normal_early.jsonl"])
    (data_dir / "sessions" / "session_normal_early.jsonl").write_text(
        "".join(
            line
            for line in (data_dir / "sessions" / "session_normal_early.jsonl").read_text().splitlines(True)
            if "milestone_reached" not in line
        )
    )
    s = load_sessions(data_dir)[0]
    assert s.goals == []
    assert s.last_goal is None


def test_duplicate_copies_of_a_session_are_deduplicated(make_data_dir):
    data_dir = make_data_dir(sessions=["session_normal.jsonl", "session_normal_early.jsonl"])
    sessions = load_sessions(data_dir)
    assert len(sessions) == 1
    assert sessions[0].event_count == 15


def test_highest_goal_is_numeric_not_lexical(make_data_dir):
    data_dir = make_data_dir(sessions=["session_normal.jsonl"])
    path = data_dir / "sessions" / "session_normal.jsonl"
    path.write_text(path.read_text().replace('"G2"', '"G10"'))
    assert load_sessions(data_dir)[0].last_goal == "G10"
