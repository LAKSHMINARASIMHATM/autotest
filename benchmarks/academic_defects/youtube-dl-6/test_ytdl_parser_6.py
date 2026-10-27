import pytest
from ytdl_parser_6 import parse_duration_seconds, sanitize_title

def test_sanitize_title():
    assert sanitize_title("My Video: Part 1 / 2?") == "My Video Part 1  2"

def test_duration_seconds():
    # 03:20 = 3*60 + 20 = 200 seconds
    assert parse_duration_seconds("03:20") == 200
