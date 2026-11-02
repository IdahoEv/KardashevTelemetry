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
        "event_count": 15,
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


def test_sessions_rejects_unknown_dev_mode(full_data_dir):
    response = TestClient(create_app(full_data_dir)).get("/api/sessions?dev=bogus")
    assert response.status_code == 422


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
