import pytest
from commons_csv_13 import parse_csv_line

def test_parse_simple_csv():
    assert parse_csv_line("a,b,c") == ["a", "b", "c"]

def test_parse_quoted_field():
    # Exposes bug: quotes must be unwrapped
    res = parse_csv_line('"hello, world",42')
    assert res == ["hello, world", "42"]
