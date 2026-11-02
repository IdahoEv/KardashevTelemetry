from kardashev_analysis.stats import compute_stats

from test_filters import summary


def test_empty_selection_has_nulls_and_zero_counts():
    assert compute_stats([]) == {
        "sessions": 0,
        "wall_time_s": {"n": 0, "median": None, "mean": None},
        "sim_time_s": {"n": 0, "median": None, "mean": None},
        "goals": {},
        "stalls_per_session": {"n": 0, "mean": None},
        "events_per_session": {"n": 0, "median": None},
    }


def test_time_and_event_aggregates():
    stats = compute_stats(
        [
            summary(wall_time_s=10.0, sim_time_s=100.0, event_count=4, stall_count=0),
            summary(wall_time_s=20.0, sim_time_s=300.0, event_count=10, stall_count=2),
            summary(wall_time_s=60.0, sim_time_s=200.0, event_count=6, stall_count=1),
        ]
    )
    assert stats["sessions"] == 3
    assert stats["wall_time_s"] == {"n": 3, "median": 20.0, "mean": 30.0}
    assert stats["sim_time_s"] == {"n": 3, "median": 200.0, "mean": 200.0}
    assert stats["stalls_per_session"] == {"n": 3, "mean": 1.0}
    assert stats["events_per_session"] == {"n": 3, "median": 6}


def test_missing_sim_time_is_excluded_from_its_n():
    stats = compute_stats([summary(sim_time_s=None), summary(sim_time_s=50.0)])
    assert stats["sim_time_s"] == {"n": 1, "median": 50.0, "mean": 50.0}


def test_per_goal_reach_and_time_to_goal():
    stats = compute_stats(
        [
            summary(goals=["G1", "G2"], goal_times={"G1": 100.0, "G2": 400.0}),
            summary(goals=["G1"], goal_times={"G1": 300.0}),
            summary(goals=[], goal_times={}),
            summary(goals=["G1"], goal_times={"G1": 200.0}),
        ]
    )
    assert stats["goals"]["G1"] == {
        "reached": 3,
        "reach_rate": 0.75,
        "time_to_goal": {"n": 3, "median": 200.0, "mean": 200.0, "min": 100.0, "max": 300.0},
    }
    assert stats["goals"]["G2"]["reached"] == 1
    assert stats["goals"]["G2"]["reach_rate"] == 0.25
    assert stats["goals"]["G2"]["time_to_goal"] == {
        "n": 1, "median": 400.0, "mean": 400.0, "min": 400.0, "max": 400.0
    }


def test_goal_reached_without_a_time_has_null_time_stats():
    stats = compute_stats([summary(goals=["G1"], goal_times={})])
    assert stats["goals"]["G1"]["reached"] == 1
    assert stats["goals"]["G1"]["time_to_goal"] == {
        "n": 0, "median": None, "mean": None, "min": None, "max": None
    }
