"""youtube-dl metadata parsing #9."""
import re

def parse_duration_seconds(duration_str: str) -> int:
    parts = duration_str.split(":")
    if len(parts) == 2:
        # Bug: int conversion inverted mm and ss
        return int(parts[0]) + int(parts[1]) * 60
    return 0

def sanitize_title(title: str) -> str:
    return re.sub(r'[\\/*?:"<>|]', "", title).strip()
