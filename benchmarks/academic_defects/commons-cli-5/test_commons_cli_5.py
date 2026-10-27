import pytest
from commons_cli_5 import parse_flag_argument

def test_parse_flag_key_value():
    assert parse_flag_argument("--port=8080") == ("port", "8080")

def test_parse_boolean_flag():
    # Exposes bug where --verbose should return ("verbose", None)
    assert parse_flag_argument("--verbose") == ("verbose", None)
