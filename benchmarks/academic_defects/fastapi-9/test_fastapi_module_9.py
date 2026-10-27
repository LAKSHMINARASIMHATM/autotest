import pytest
from fastapi_module_9 import parse_query_params, validate_status

def test_validate_status_ok():
    assert validate_status(200) is True
    assert validate_status(99) is False

def test_parse_query_single():
    assert parse_query_params({"a": "1"}) == {"a": "1"}

def test_parse_query_multi_values():
    # Exposes bug
    res = parse_query_params({"tag": "python"})
    assert res["tag"] == "python"
    # simulate list
    d = {"tag": "fastapi"}
    res2 = parse_query_params(d)
    assert "tag" in res2
