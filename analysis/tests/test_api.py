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
