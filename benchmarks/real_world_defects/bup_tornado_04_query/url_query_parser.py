"""Real-world URL query string parser with multi-value and percent-decoding support.
Modeled after BugsInPy / Tornado HTTP request parameter parsing defects.
"""
from __future__ import annotations

import urllib.parse
from typing import Any


def parse_query_string(query_str: str) -> dict[str, Any]:
    """Parses a raw query string into a structured dictionary.
    Handles multiple values for the same key, percent-decoding, and empty flags.
    """
    if not query_str or not query_str.strip():
        return {}

    # Strip leading '?' if present
    if query_str.startswith("?"):
        query_str = query_str[1:]

    result: dict[str, Any] = {}
    pairs = query_str.split("&")

    for pair in pairs:
        if not pair:
            continue
        parts = pair.split("=", 1)
        key = urllib.parse.unquote_plus(parts[0])
        val = urllib.parse.unquote_plus(parts[1]) if len(parts) > 1 else ""

        if key in result:
            # BUG: Overwrites existing key instead of collecting into a list!
            result[key] = val
        else:
            result[key] = val

    return result
