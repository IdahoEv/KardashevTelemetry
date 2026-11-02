from kardashev_analysis.filters import SessionFilters, matches
from kardashev_analysis.sessions_store import SessionSummary


def summary(**overrides):
    base = dict(
        session_id="s",
        install_id="i",
        player_name="TestPilot",
        build_version="0.3.1",
        build_commit="abc1234",
        wall_time_s=10.0,
        sim_time_s=100.0,
        goals=["G1", "G2"],
        last_goal="G2",
        dev=False,
        event_count=5,
        ended=True,
    )
    return SessionSummary(**{**base, **overrides})


def test_default_excludes_dev():
    assert matches(summary(), SessionFilters())
    assert not matches(summary(dev=True), SessionFilters())


def test_dev_include_and_only():
    assert matches(summary(dev=True), SessionFilters(dev="include"))
    assert matches(summary(), SessionFilters(dev="include"))
    assert matches(summary(dev=True), SessionFilters(dev="only"))
    assert not matches(summary(), SessionFilters(dev="only"))


def test_name_is_case_insensitive_substring():
    assert matches(summary(), SessionFilters(name="pilot"))
    assert not matches(summary(), SessionFilters(name="nobody"))


def test_name_filter_excludes_unnamed():
    assert not matches(summary(player_name=None), SessionFilters(name="a"))


def test_build_matches_version_or_commit_any_of():
    assert matches(summary(), SessionFilters(build=["0.3.1"]))
    assert matches(summary(), SessionFilters(build=["zzz", "abc1234"]))
    assert not matches(summary(), SessionFilters(build=["0.2.0"]))


def test_reached_requires_all_goals():
    assert matches(summary(), SessionFilters(reached=["G1", "G2"]))
    assert not matches(summary(), SessionFilters(reached=["G1", "G3"]))
    assert not matches(summary(goals=[]), SessionFilters(reached=["G1"]))
