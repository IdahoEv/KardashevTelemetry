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
    validate,
)


@dataclass
class IngestReport:
    written: int = 0
    written_dev: int = 0
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
            validate(events)
            session_id = events[0]["session_id"]
        except ValueError as exc:
            _warn(f"skipping {path.name}: {exc}")
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


def ingest(raw_dir, sessions_dir, dev_sessions_dir):
    report = IngestReport()
    sessions_dir, dev_sessions_dir = Path(sessions_dir), Path(dev_sessions_dir)
    sessions_dir.mkdir(parents=True, exist_ok=True)
    dev_sessions_dir.mkdir(parents=True, exist_ok=True)
    for session_id, events in _load_copies(raw_dir, report).items():
        try:
            check_schema(events)
        except UnsupportedSchema as exc:
            _warn(f"skipping session {session_id}: {exc}")
            report.skipped_schema += 1
            continue
        target, other = (dev_sessions_dir, sessions_dir) if is_dev(events) else (sessions_dir, dev_sessions_dir)
        _write_atomic(target / f"{session_id}.jsonl", order(events))
        (other / f"{session_id}.jsonl").unlink(missing_ok=True)
        if target is dev_sessions_dir:
            report.written_dev += 1
        else:
            report.written += 1
    return report
