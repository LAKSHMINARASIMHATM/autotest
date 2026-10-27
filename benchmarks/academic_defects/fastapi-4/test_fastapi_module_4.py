import pytest
from fastapi_module_4 import normalize_header_name, get_content_length

def test_normalize_basic():
    assert normalize_header_name("x_token") == "x-token"

def test_get_content_length_upper():
    # Exposes bug: uppercase Content_Length
    headers = {"Content_Length": "42"}
    assert get_content_length(headers) == 42
