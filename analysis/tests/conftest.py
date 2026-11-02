import shutil
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"

S1 = "11111111-0000-4000-8000-000000000001"
S2 = "11111111-0000-4000-8000-000000000002"
S3 = "11111111-0000-4000-8000-000000000003"
S4 = "11111111-0000-4000-8000-000000000004"


@pytest.fixture
def make_data_dir(tmp_path):
    def build(sessions=(), dev_sessions=()):
        for dirname, names in (("sessions", sessions), ("dev_sessions", dev_sessions)):
            if not names:
                continue
            target = tmp_path / dirname
            target.mkdir()
            for name in names:
                shutil.copy(FIXTURES / name, target / name)
        return tmp_path

    return build


@pytest.fixture
def full_data_dir(make_data_dir):
    return make_data_dir(
        sessions=["session_normal.jsonl", "session_stalled.jsonl", "session_old_build.jsonl"],
        dev_sessions=["session_dev.jsonl"],
    )
