import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

from kardashev_analysis.session_file import (
    UnsupportedSchema,
    check_schema,
    is_dev,
    order,
    parse,
)


@dataclass
class IngestReport:
    written: int = 0
    excluded_dev: int = 0
    skipped_schema: int = 0
    skipped_invalid: int = 0


def _message_id(path):
    return int(path.name.split("_", 1)[0])


def _warn(message):
    print(f"warning: {message}", file=sys.stderr)


def _load_copies(raw_dir, report):
    """Map session_id -> (events, message_id) of its largest, then latest, copy."""
    best = {}
    for path in sorted(Path(raw_dir).glob("*.jsonl")):
        try:
            events = parse(path)
            session_id = events[0]["session_id"]
        except (ValueError, IndexError, KeyError) as exc:
            _warn(f"skipping {path.name}: {exc or 'empty or missing session_id'}")
            report.skipped_invalid += 1
            continue
        rank = (len(events), _message_id(path))
        if session_id not in best or rank > best[session_id][0]:
            best[session_id] = (rank, events)
    return {sid: events for sid, (_, events) in best.items()}


def _write_atomic(path, events):
    tmp = path.with_suffix(".jsonl.tmp")
    tmp.write_text("".join(json.dumps(e) + "\n" for e in events))
    os.replace(tmp, path)


def ingest(raw_dir, sessions_dir):
    report = IngestReport()
    sessions_dir = Path(sessions_dir)
    sessions_dir.mkdir(parents=True, exist_ok=True)
    for session_id, events in _load_copies(raw_dir, report).items():
        try:
            check_schema(events)
        except UnsupportedSchema as exc:
            _warn(f"skipping session {session_id}: {exc}")
            report.skipped_schema += 1
            continue
        if is_dev(events):
            report.excluded_dev += 1
            continue
        _write_atomic(sessions_dir / f"{session_id}.jsonl", order(events))
        report.written += 1
    return report
