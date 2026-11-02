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


def test_goal_times_use_elapsed_sim_time_even_for_old_builds(full_data_dir):
    sessions = _by_id(full_data_dir)
    assert sessions[S1].goal_times == {"G1": 5400.0, "G2": 12000.0}
    assert sessions[S4].goal_times == {"G1": 7000.0}


def test_stall_count(full_data_dir):
    sessions = _by_id(full_data_dir)
    assert sessions[S3].stall_count == 2
    assert sessions[S1].stall_count == 0


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


def test_last_goal_is_the_last_reached_not_the_highest_id(make_data_dir):
    data_dir = make_data_dir(sessions=["session_normal.jsonl"])
    path = data_dir / "sessions" / "session_normal.jsonl"
    path.write_text(path.read_text().replace('"G2"', '"A0"'))
    assert load_sessions(data_dir)[0].last_goal == "A0"


def test_milestone_without_an_id_is_skipped(make_data_dir):
    data_dir = make_data_dir(sessions=["session_normal.jsonl"])
    path = data_dir / "sessions" / "session_normal.jsonl"
    path.write_text(path.read_text().replace('"milestone_id": "G2", ', ""))
    s = load_sessions(data_dir)[0]
    assert s.goals == ["G1"]
    assert s.last_goal == "G1"
    assert s.goal_times == {"G1": 5400.0}


def test_truncated_line_does_not_fail_the_load(make_data_dir):
    data_dir = make_data_dir(sessions=["session_normal.jsonl", "session_stalled.jsonl"])
    path = data_dir / "sessions" / "session_stalled.jsonl"
    path.write_text(path.read_text() + '{"session_id": "cut", "se')
    assert len(load_sessions(data_dir)) == 2
