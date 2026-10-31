import json
import re
from pathlib import Path

SUPPORTED_SCHEMA = 1
SESSION_ID = re.compile(r"[A-Za-z0-9_-]{1,64}")


class UnsupportedSchema(ValueError):
    pass


def parse(path):
    events = []
    for n, line in enumerate(Path(path).read_text().splitlines(), start=1):
        if not line.strip():
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}: line {n}: {exc}") from exc
    return events


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate(events):
    """Raise ValueError unless events are well-formed enough to order and name."""
    if not events:
        raise ValueError("empty file")
    for e in events:
        if not isinstance(e, dict) or "seq" not in e:
            raise ValueError("event is not an object with a seq")
        props = e.get("props", {})
        if not isinstance(props, dict):
            raise ValueError("event props is not an object")
        if not _is_number(e["seq"]) or not _is_number(props.get("tick", 0)):
            raise ValueError("event seq or tick is not a number")
    session_id = events[0].get("session_id")
    if not isinstance(session_id, str) or not SESSION_ID.fullmatch(session_id):
        raise ValueError("missing or unsafe session_id")


def is_dev(events):
    return any(e.get("dev_session") for e in events)


def check_schema(events):
    for e in events:
        version = e.get("schema_version", SUPPORTED_SCHEMA)
        if version != SUPPORTED_SCHEMA:
            raise UnsupportedSchema(f"unsupported schema_version {version!r}")


def order(events):
    # Events without props.tick inherit the last tick seen in seq order, so
    # they stay beside their neighbours instead of sorting to either end.
    keyed = []
    tick = 0
    for e in sorted(events, key=lambda e: e["seq"]):
        tick = e.get("props", {}).get("tick", tick)
        keyed.append(((tick, e["seq"]), e))
    return [e for _, e in sorted(keyed, key=lambda pair: pair[0])]
