"""Real-world media URL parser and video ID extractor.
Modeled after BugsInPy / youtube-dl URL extraction defects.
"""
from __future__ import annotations

import re


class ExtractionError(Exception):
    pass


class VideoExtractor:
    """Extracts YouTube 11-character video IDs across standard, short, and embedded URL formats."""

    # BUG: Fails on short-link URLs (youtu.be/ID) when query parameters (e.g. ?t=10s) are appended
    STANDARD_PATTERN = re.compile(
        r"(?:https?://)?(?:www\.)?(?:youtube\.com/(?:watch\?v=|embed/)|youtu\.be/)([\w-]{11})"
    )

    @classmethod
    def extract_video_id(cls, url: str) -> str:
        if not url or not url.strip():
            raise ExtractionError("URL cannot be empty")

        url = url.strip()
        match = cls.STANDARD_PATTERN.search(url)
        if not match:
            raise ExtractionError(f"Could not extract valid 11-char video ID from: '{url}'")

        return match.group(1)
