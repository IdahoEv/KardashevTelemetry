import json

import pytest

from kardashev_analysis.session_file import (
    UnsupportedSchema,
    check_schema,
    is_dev,
    order,
    parse,
)


def ev(seq, tick=None, **extra):
    props = {} if tick is None else {"tick": tick}
    return {"seq": seq, "props": props, **extra}


def test_parse_skips_blank_lines(tmp_path):
    p = tmp_path / "s.jsonl"
    p.write_text('{"seq": 1}\n\n{"seq": 2}\n')
    assert [e["seq"] for e in parse(p)] == [1, 2]


def test_parse_reports_line_number_of_malformed_json(tmp_path):
    p = tmp_path / "s.jsonl"
    p.write_text('{"seq": 1}\n{oops\n')
    with pytest.raises(ValueError, match="line 2"):
        parse(p)


def test_is_dev_true_if_any_event_flagged():
    assert is_dev([{"dev_session": False}, {"dev_session": True}])


def test_is_dev_false_when_none_flagged():
    assert not is_dev([{"dev_session": False}, {}])


def test_order_sorts_by_tick_then_seq():
    events = [ev(1, 5), ev(2, 3), ev(3, 3)]
    assert [e["seq"] for e in order(events)] == [2, 3, 1]


def test_order_keeps_tickless_events_next_to_their_predecessor():
    events = [ev(1), ev(2, 4), ev(3), ev(4, 2), ev(5)]
    assert [e["seq"] for e in order(events)] == [1, 4, 5, 2, 3]


def test_order_without_any_tick_is_seq_order():
    assert [e["seq"] for e in order([ev(2), ev(1), ev(3)])] == [1, 2, 3]


def test_check_schema_accepts_absent_and_one():
    check_schema([{"seq": 1}, {"seq": 2, "schema_version": 1}])


def test_check_schema_rejects_other_versions():
    with pytest.raises(UnsupportedSchema, match="2"):
        check_schema([{"seq": 1, "schema_version": 2}])


def test_parse_roundtrip_preserves_fields(tmp_path):
    p = tmp_path / "s.jsonl"
    p.write_text(json.dumps({"seq": 1, "x": [1]}) + "\n")
    assert parse(p) == [{"seq": 1, "x": [1]}]
