from statistics import mean, median


def compute_stats(sessions):
    return {
        "sessions": len(sessions),
        "wall_time_s": _describe([s.wall_time_s for s in sessions], median=median, mean=mean),
        "sim_time_s": _describe([s.sim_time_s for s in sessions], median=median, mean=mean),
        "goals": {goal: _goal_stats(goal, sessions) for goal in _goal_ids(sessions)},
        "stalls_per_session": _describe([s.stall_count for s in sessions], mean=mean),
        "events_per_session": _describe([s.event_count for s in sessions], median=median),
    }


def _goal_ids(sessions):
    return sorted({g for s in sessions for g in s.goals}, key=_goal_order)


def _goal_order(goal_id):
    digits = "".join(c for c in goal_id if c.isdigit())
    return (int(digits) if digits else -1, goal_id)


def _goal_stats(goal, sessions):
    reached = sum(1 for s in sessions if goal in s.goals)
    times = [s.goal_times[goal] for s in sessions if goal in s.goal_times]
    return {
        "reached": reached,
        "reach_rate": reached / len(sessions),
        "time_to_goal": _describe(times, median=median, mean=mean, min=min, max=max),
    }


def _describe(values, **aggregates):
    present = [v for v in values if v is not None]
    return {"n": len(present)} | {
        name: aggregate(present) if present else None for name, aggregate in aggregates.items()
    }
