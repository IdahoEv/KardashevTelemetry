import json
from pathlib import Path

SUPPORTED_SCHEMA = 1


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
