from dataclasses import asdict, dataclass, field

import duckdb

# Explicit columns so fields absent from every file (e.g. player_name) read as null instead of erroring.
_COLUMNS = (
    "{'session_id': 'VARCHAR', 'install_id': 'VARCHAR', "
    "'build': 'STRUCT(version VARCHAR, commit VARCHAR)', "
    "'seq': 'BIGINT', 't_ms': 'DOUBLE', 'sim_time_s': 'DOUBLE', "
    "'event': 'VARCHAR', 'player_name': 'VARCHAR', 'props': 'JSON'}"
)

_SUMMARY_SQL = f"""
with e as (
    select * from read_json(?, columns = {_COLUMNS}, format = 'newline_delimited', ignore_errors = true)
    where session_id is not null
    qualify row_number() over (partition by session_id, seq order by t_ms) = 1
)
select
    session_id,
    arg_min(install_id, seq) as install_id,
    max(player_name) filter (where event = 'session_start') as player_name,
    arg_min(build.version, seq) as build_version,
    arg_min(build.commit, seq) as build_commit,
    max(t_ms) / 1000.0 as wall_time_s,
    max(sim_time_s) as sim_time_s,
    list(props ->> 'milestone_id' order by seq) filter (where event = 'milestone_reached') as goals,
    count(*) as event_count,
    bool_or(event = 'session_end') as ended,
    count(*) filter (where event = 'building_stalled') as stall_count,
    list({{'goal': props ->> 'milestone_id', 'elapsed': (props ->> 'elapsed_sim_time_s')::double}} order by seq)
        filter (where event = 'milestone_reached') as goal_times
from e
group by session_id
order by session_id
"""


@dataclass(frozen=True)
class SessionSummary:
    session_id: str
    install_id: str
    player_name: str | None
    build_version: str | None
    build_commit: str | None
    wall_time_s: float
    sim_time_s: float | None
    goals: list[str]
    last_goal: str | None
    dev: bool
    event_count: int
    ended: bool
    stall_count: int = 0
    goal_times: dict[str, float] = field(default_factory=dict)

    def row(self):
        return {k: v for k, v in asdict(self).items() if k not in _STATS_ONLY_FIELDS}


_STATS_ONLY_FIELDS = {"stall_count", "goal_times"}


def count_sessions(data_dir):
    return sum(1 for _ in (data_dir / "sessions").glob("*.jsonl"))


def load_sessions(data_dir):
    return _load_dir(data_dir / "sessions", dev=False) + _load_dir(data_dir / "dev_sessions", dev=True)


def _load_dir(directory, dev):
    if not any(directory.glob("*.jsonl")):
        return []
    rows = duckdb.connect().execute(_SUMMARY_SQL, [str(directory / "*.jsonl")]).fetchall()
    return [_summarize(row, dev) for row in rows]


def _summarize(row, dev):
    session_id, install_id, player_name, version, commit, wall, sim, raw_goals, count, ended, stalls, raw_times = row
    goals = list(dict.fromkeys(raw_goals or []))
    goal_times = {}
    for entry in raw_times or []:
        if entry["elapsed"] is not None:
            goal_times[entry["goal"]] = min(entry["elapsed"], goal_times.get(entry["goal"], entry["elapsed"]))
    return SessionSummary(
        session_id=session_id,
        install_id=install_id,
        player_name=player_name,
        build_version=version,
        build_commit=commit,
        wall_time_s=wall,
        sim_time_s=sim,
        goals=goals,
        last_goal=goals[-1] if goals else None,
        dev=dev,
        event_count=count,
        ended=bool(ended),
        stall_count=stalls,
        goal_times=goal_times,
    )

