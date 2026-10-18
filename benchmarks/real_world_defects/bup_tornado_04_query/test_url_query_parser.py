"""PyTest suite for url_query_parser — tests multi-value parameters, decoding, and flags."""
import pytest
from url_query_parser import parse_query_string


def test_single_parameter():
    res = parse_query_string("name=autotest&version=1.0")
    assert res == {"name": "autotest", "version": "1.0"}


def test_multi_value_parameter():
    """Real-world defect: Multiple parameters with same key must accumulate into a list."""
    res = parse_query_string("tag=python&tag=testing&tag=agentic")
    assert res["tag"] == ["python", "testing", "agentic"]


def test_percent_decoding():
    res = parse_query_string("query=hello+world%21&author=AutoTest%20AI")
    assert res["query"] == "hello world!"
    assert res["author"] == "AutoTest AI"


def test_empty_string_and_leading_question_mark():
    assert parse_query_string("") == {}
    assert parse_query_string("?foo=bar") == {"foo": "bar"}


def test_flag_without_value():
    res = parse_query_string("debug&verbose=true")
    assert res["debug"] == ""
    assert res["verbose"] == "true"
