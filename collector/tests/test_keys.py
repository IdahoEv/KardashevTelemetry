import pytest

from kardashev_collector.keys import is_valid_id, object_key

A = "00000000-0000-4000-8000-00000000a001"
B = "11111111-0000-4000-8000-000000000001"


def test_object_key_joins_ids():
    assert object_key(A, B) == f"{A}/{B}.jsonl"


@pytest.mark.parametrize("bad", ["", "abc", A.upper(), A + "x", "../" + A, A.replace("-", ""), f"{A}/{B}"])
def test_invalid_ids(bad):
    assert not is_valid_id(bad)


def test_object_key_rejects_invalid_ids():
    with pytest.raises(ValueError):
        object_key("../x", B)
    with pytest.raises(ValueError):
        object_key(A, "a/b")
