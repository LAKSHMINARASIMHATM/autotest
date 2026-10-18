"""Real-world NLP token span and punctuation normalizer.
Modeled after BugsInPy / spaCy tokenizer and entity boundary defects.
"""
from __future__ import annotations

import re
from typing import NamedTuple


class TokenSpan(NamedTuple):
    text: str
    start_char: int
    end_char: int


class SpanCleaner:
    """Cleans token spans while preserving abbreviations and character offsets."""

    ABBREVIATIONS = {"u.s.a.", "e.g.", "i.e.", "etc.", "ph.d."}

    @classmethod
    def clean_and_tokenize(cls, text: str) -> list[TokenSpan]:
        if not text:
            return []

        spans = []
        # Match word tokens or punctuation
        pattern = re.compile(r"\S+")
        for match in pattern.finditer(text):
            raw_token = match.group(0)
            start = match.start()
            end = match.end()

            # Check abbreviation
            if raw_token.lower() in cls.ABBREVIATIONS:
                spans.append(TokenSpan(raw_token, start, end))
                continue

            # BUG: Blindly strips trailing punctuation without adjusting end_char offset!
            cleaned = raw_token.rstrip(".,!?;:")
            if cleaned:
                # When punctuation is stripped, end_char must reflect the actual cleaned length
                spans.append(TokenSpan(cleaned, start, end))

        return spans
