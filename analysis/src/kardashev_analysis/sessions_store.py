def count_sessions(data_dir):
    return sum(1 for _ in (data_dir / "sessions").glob("*.jsonl"))
