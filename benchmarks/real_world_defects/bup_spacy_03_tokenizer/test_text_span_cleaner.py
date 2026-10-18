"""PyTest suite for SpanCleaner — validates token offsets, punctuation stripping, and abbreviations."""
import pytest
from text_span_cleaner import SpanCleaner, TokenSpan


def test_clean_tokens_standard():
    spans = SpanCleaner.clean_and_tokenize("Hello world")
    assert len(spans) == 2
    assert spans[0] == TokenSpan("Hello", 0, 5)
    assert spans[1] == TokenSpan("world", 6, 11)


def test_trailing_punctuation_offset_accurate():
    """Real-world defect: end_char MUST match start_char + len(cleaned_token)."""
    spans = SpanCleaner.clean_and_tokenize("Hello, world!")
    assert len(spans) == 2
    # "Hello," has start=0, raw length=6, but cleaned="Hello" (length=5). end_char should be 5, not 6!
    assert spans[0].text == "Hello"
    assert spans[0].end_char == 5
    assert spans[1].text == "world"
    assert spans[1].end_char == 12


def test_abbreviation_preserved():
    spans = SpanCleaner.clean_and_tokenize("Welcome to U.S.A. today")
    assert any(s.text == "U.S.A." for s in spans)


def test_empty_input():
    assert SpanCleaner.clean_and_tokenize("") == []
