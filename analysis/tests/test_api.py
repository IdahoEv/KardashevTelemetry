import shutil
from pathlib import Path

from fastapi.testclient import TestClient

from kardashev_analysis.api import create_app

FIXTURES = Path(__file__).parent / "fixtures"


def _data_dir_with_sessions(tmp_path, names):
    sessions = tmp_path / "sessions"
    sessions.mkdir()
    for name in names:
        shutil.copy(FIXTURES / name, sessions / name)
    return tmp_path


def test_health_counts_sessions(tmp_path):
    data_dir = _data_dir_with_sessions(tmp_path, ["session_normal.jsonl", "session_stalled.jsonl"])
    response = TestClient(create_app(data_dir)).get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "session_count": 2}


def test_health_with_missing_sessions_dir_counts_zero(tmp_path):
    response = TestClient(create_app(tmp_path)).get("/api/health")
    assert response.json() == {"status": "ok", "session_count": 0}


def _sessions(data_dir, query=""):
    response = TestClient(create_app(data_dir)).get(f"/api/sessions{query}")
    assert response.status_code == 200
    return response.json()


def _ids(body):
    return {s["session_id"][-1] for s in body["sessions"]}


def test_sessions_default_excludes_dev(full_data_dir):
    body = _sessions(full_data_dir)
    assert (body["total_unfiltered"], body["total"]) == (4, 3)
    assert _ids(body) == {"1", "3", "4"}


def test_sessions_row_shape(full_data_dir):
    row = next(s for s in _sessions(full_data_dir)["sessions"] if s["session_id"].endswith("1"))
    assert row == {
        "session_id": "11111111-0000-4000-8000-000000000001",
        "install_id": "00000000-0000-4000-8000-00000000a001",
        "player_name": "TestPilot",
        "build_version": "0.3.1",
        "build_commit": "abc1234",
        "wall_time_s": 22.5,
        "sim_time_s": row["sim_time_s"],
        "goals": ["G1", "G2"],
        "last_goal": "G2",
        "dev": False,
        "event_count": 16,
        "ended": True,
    }


def test_sessions_dev_only_and_include(full_data_dir):
    assert _ids(_sessions(full_data_dir, "?dev=only")) == {"2"}
    assert _ids(_sessions(full_data_dir, "?dev=include")) == {"1", "2", "3", "4"}


def test_sessions_name_filter(full_data_dir):
    body = _sessions(full_data_dir, "?name=testp")
    assert _ids(body) == {"1"}
    assert body["total_unfiltered"] == 4


def test_sessions_repeated_build_filter(full_data_dir):
    assert _ids(_sessions(full_data_dir, "?build=0.2.0&build=nope")) == {"4"}
    assert _ids(_sessions(full_data_dir, "?build=7383dc8")) == {"4"}


def test_sessions_repeated_reached_filter(full_data_dir):
    assert _ids(_sessions(full_data_dir, "?reached=G1")) == {"1", "3", "4"}
    assert _ids(_sessions(full_data_dir, "?reached=G1&reached=G2")) == {"1"}


def test_sessions_empty_data_dir(tmp_path):
    assert _sessions(tmp_path) == {"total_unfiltered": 0, "total": 0, "sessions": []}


def test_sessions_empty_filter_values_are_ignored(full_data_dir):
    unfiltered = _sessions(full_data_dir)
    assert _sessions(full_data_dir, "?build=") == unfiltered
    assert _sessions(full_data_dir, "?reached=") == unfiltered


def test_sessions_rejects_unknown_dev_mode(full_data_dir):
    response = TestClient(create_app(full_data_dir)).get("/api/sessions?dev=bogus")
    assert response.status_code == 422


def _detail(data_dir, session_id):
    response = TestClient(create_app(data_dir)).get(f"/api/sessions/{session_id}")
    assert response.status_code == 200
    return response.json()


def test_session_detail_row_shape(full_data_dir):
    row = _detail(full_data_dir, "11111111-0000-4000-8000-000000000001")
    assert row == {
        "session_id": "11111111-0000-4000-8000-000000000001",
        "install_id": "00000000-0000-4000-8000-00000000a001",
        "player_name": "TestPilot",
        "build_version": "0.3.1",
        "build_commit": "abc1234",
        "wall_time_s": 22.5,
        "sim_time_s": row["sim_time_s"],
        "goals": ["G1", "G2"],
        "last_goal": "G2",
        "dev": False,
        "event_count": 16,
        "ended": True,
        "goal_times": [
            {"goal": "G1", "sim_time_s": 5400.0},
            {"goal": "G2", "sim_time_s": 12000.0},
        ],
        "buildings": {
            "types": ["mine", "factory"],
            "series": [
                {"sim_time_s": 3000.0, "counts": {"mine": 1}},
                {"sim_time_s": 13000.0, "counts": {"mine": 1, "factory": 1}},
                {"sim_time_s": 13500.0, "counts": {"mine": 2, "factory": 1}},
            ],
        },
    }


def test_session_detail_matches_list_row(full_data_dir):
    detail = _detail(full_data_dir, "11111111-0000-4000-8000-000000000001")
    listed = next(
        s for s in _sessions(full_data_dir, "?dev=include")["sessions"] if s["session_id"].endswith("1")
    )
    assert {k: v for k, v in detail.items() if k not in ("goal_times", "buildings")} == listed


def test_session_detail_dev_session_reachable_by_id(full_data_dir):
    detail = _detail(full_data_dir, "11111111-0000-4000-8000-000000000002")
    assert detail["dev"] is True
    assert detail["buildings"] == {
        "types": ["mine"],
        "series": [{"sim_time_s": 2000.0, "counts": {"mine": 1}}],
    }


def test_session_detail_old_build_session(full_data_dir):
    detail = _detail(full_data_dir, "11111111-0000-4000-8000-000000000004")
    assert detail["goal_times"] == [{"goal": "G1", "sim_time_s": 7000.0}]
    assert detail["buildings"] == {"types": [], "series": []}


def test_session_detail_unknown_id_is_404(full_data_dir):
    response = TestClient(create_app(full_data_dir)).get("/api/sessions/nope")
    assert response.status_code == 404


def _stats(data_dir, query=""):
    response = TestClient(create_app(data_dir)).get(f"/api/stats{query}")
    assert response.status_code == 200
    return response.json()


def test_stats_default_filter_excludes_dev(full_data_dir):
    stats = _stats(full_data_dir)
    assert stats["sessions"] == 3
    assert stats["goals"]["G1"]["reached"] == 3
    assert stats["goals"]["G1"]["reach_rate"] == 1.0
    assert stats["goals"]["G1"]["time_to_goal"]["n"] == 3
    assert stats["goals"]["G1"]["time_to_goal"]["min"] == 4000.0
    assert stats["goals"]["G1"]["time_to_goal"]["max"] == 7000.0
    assert stats["goals"]["G2"]["reached"] == 1
    assert stats["stalls_per_session"] == {"n": 3, "mean": 2 / 3}


def test_stats_dev_include_adds_the_dev_session(full_data_dir):
    stats = _stats(full_data_dir, "?dev=include")
    assert stats["sessions"] == 4
    assert stats["goals"]["G1"]["time_to_goal"]["n"] == 4


def test_stats_uses_the_same_filters_as_sessions(full_data_dir):
    stats = _stats(full_data_dir, "?build=0.2.0")
    assert stats["sessions"] == 1
    assert stats["goals"]["G1"]["time_to_goal"]["median"] == 7000.0


def test_stats_empty_match_is_null_not_an_error(full_data_dir):
    stats = _stats(full_data_dir, "?name=nobody-has-this-name")
    assert stats["sessions"] == 0
    assert stats["wall_time_s"] == {"n": 0, "median": None, "mean": None}
    assert stats["goals"] == {}
    assert stats["events_per_session"] == {"n": 0, "median": None}


def test_stats_tolerates_milestone_reached_without_an_id(make_data_dir):
    data_dir = make_data_dir(sessions=["session_normal.jsonl"])
    path = data_dir / "sessions" / "session_normal.jsonl"
    path.write_text(path.read_text().replace('"milestone_id": "G2", ', ""))
    stats = _stats(data_dir)
    assert stats["sessions"] == 1
    assert set(stats["goals"]) == {"G1"}


def test_stats_with_no_data(tmp_path):
    assert _stats(tmp_path)["sessions"] == 0


def test_serves_built_dashboard_alongside_api(tmp_path):
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<h1>dash</h1>")
    client = TestClient(create_app(tmp_path / "data", dist_dir=dist))
    assert "<h1>dash</h1>" in client.get("/").text
    assert client.get("/api/health").json()["status"] == "ok"


def test_root_is_404_without_built_dashboard(tmp_path):
    client = TestClient(create_app(tmp_path, dist_dir=tmp_path / "nope"))
    assert client.get("/").status_code == 404
