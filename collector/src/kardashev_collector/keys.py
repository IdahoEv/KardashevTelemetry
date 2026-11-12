import re

_ID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

ID_PATTERN = _ID.pattern


def is_valid_id(value):
    return _ID.fullmatch(value) is not None


def object_key(install_id, session_id):
    if not is_valid_id(install_id) or not is_valid_id(session_id):
        raise ValueError("install_id and session_id must be lowercase UUIDs")
    return f"{install_id}/{session_id}.jsonl"
