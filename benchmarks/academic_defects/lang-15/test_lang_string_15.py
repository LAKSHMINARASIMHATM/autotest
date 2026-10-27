import pytest
from lang_string_15 import capitalize_words, is_numeric

def test_is_numeric():
    assert is_numeric("123.45") is True
    assert is_numeric("abc") is False

def test_capitalize_with_consecutive_spaces():
    # Exposes bug where word can be empty in "hello  world"
    assert capitalize_words("hello  world") == "Hello  World"
