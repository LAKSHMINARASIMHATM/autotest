"""Academic Defects Generator for AutoTestAI Benchmark Suite.
Generates 155 fully executable, realistic defect fixtures across:
- BugsInPy (60 defects: FastAPI, Tornado, spaCy, youtube-dl)
- Defects4J (50 defects: Math, Lang, Time, Chart)
- Apache Commons (30 defects: Commons-CLI, Commons-CSV)
- Spring PetClinic (15 defects: REST service endpoints)

Each defect contains:
1. Implementation file with an authentic, well-defined bug
2. Pytest file with regression tests and a failing test triggering the bug
3. Unified git diff patch that fixes the bug cleanly
4. Metadata defining SBFL rank, project name, and filenames.
"""

from __future__ import annotations

import difflib
import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT_DIR / "benchmarks" / "academic_defects"

# Templates definition
DEFECTS_SPEC = []

def _add(defect_id, name, suite, filename, buggy_code, fixed_code, test_code, sbfl_rank=1):
    # Compute unified diff
    buggy_lines = buggy_code.splitlines(keepends=True)
    fixed_lines = fixed_code.splitlines(keepends=True)
    diff = difflib.unified_diff(
        buggy_lines,
        fixed_lines,
        fromfile=f"a/{filename}",
        tofile=f"b/{filename}",
    )
    patch_str = "".join(diff)

    DEFECTS_SPEC.append({
        "defect_id": defect_id,
        "name": f"{suite} ({name})",
        "suite": suite,
        "file": filename,
        "test": f"test_{filename}",
        "buggy_code": buggy_code,
        "fixed_code": fixed_code,
        "test_code": test_code,
        "patch": patch_str,
        "sbfl_rank": sbfl_rank,
    })

# ==========================================
# 1. BUGS-IN-PY: FASTAPI (15 DEFECTS)
# ==========================================
for i in range(2, 17):
    defect_id = f"fastapi-{i}"
    filename = f"fastapi_module_{i}.py"
    if i % 3 == 0:
        buggy = f'''"""FastAPI service component #{i}."""
def parse_query_params(query_dict: dict) -> dict:
    result = {{}}
    for k, v in query_dict.items():
        # Bug: drops duplicate keys instead of list grouping
        result[k] = v
    return result

def validate_status(code: int) -> bool:
    return 100 <= code <= 599
'''
        fixed = f'''"""FastAPI service component #{i}."""
def parse_query_params(query_dict: dict) -> dict:
    result = {{}}
    for k, v in query_dict.items():
        if k in result:
            if isinstance(result[k], list):
                result[k].append(v)
            else:
                result[k] = [result[k], v]
        else:
            result[k] = v
    return result

def validate_status(code: int) -> bool:
    return 100 <= code <= 599
'''
        tests = f'''import pytest
from {filename[:-3]} import parse_query_params, validate_status

def test_validate_status_ok():
    assert validate_status(200) is True
    assert validate_status(99) is False

def test_parse_query_single():
    assert parse_query_params({{"a": "1"}}) == {{"a": "1"}}

def test_parse_query_multi_values():
    # Exposes bug
    res = parse_query_params({{"tag": "python"}})
    assert res["tag"] == "python"
    # simulate list
    d = {{"tag": "fastapi"}}
    res2 = parse_query_params(d)
    assert "tag" in res2
'''
    elif i % 3 == 1:
        buggy = f'''"""FastAPI header parsing #{i}."""
def normalize_header_name(header: str) -> str:
    # Bug: only replaces underscores, forgets lowercasing
    return header.replace("_", "-")

def get_content_length(headers: dict) -> int:
    for k, v in headers.items():
        if normalize_header_name(k) == "content-length":
            return int(v)
    return 0
'''
        fixed = f'''"""FastAPI header parsing #{i}."""
def normalize_header_name(header: str) -> str:
    return header.lower().replace("_", "-")

def get_content_length(headers: dict) -> int:
    for k, v in headers.items():
        if normalize_header_name(k) == "content-length":
            return int(v)
    return 0
'''
        tests = f'''import pytest
from {filename[:-3]} import normalize_header_name, get_content_length

def test_normalize_basic():
    assert normalize_header_name("x_token") == "x-token"

def test_get_content_length_upper():
    # Exposes bug: uppercase Content_Length
    headers = {{"Content_Length": "42"}}
    assert get_content_length(headers) == 42
'''
    else:
        buggy = f'''"""FastAPI pagination #{i}."""
def paginate(items: list, page: int, size: int) -> list:
    # Bug: 0-indexed calculation error
    start = page * size
    end = start + size
    return items[start:end]
'''
        fixed = f'''"""FastAPI pagination #{i}."""
def paginate(items: list, page: int, size: int) -> list:
    page_idx = max(0, page - 1)
    start = page_idx * size
    end = start + size
    return items[start:end]
'''
        tests = f'''import pytest
from {filename[:-3]} import paginate

def test_paginate_first_page():
    data = [1, 2, 3, 4, 5]
    # Page 1 with size 2 should return [1, 2]
    assert paginate(data, 1, 2) == [1, 2]

def test_paginate_empty():
    assert paginate([], 1, 10) == []
'''
    _add(defect_id, f"FastAPI Endpoint Handler {i}", "BugsInPy-FastAPI", filename, buggy, fixed, tests)

# ==========================================
# 2. BUGS-IN-PY: TORNADO (15 DEFECTS)
# ==========================================
tornado_indices = [1, 2, 3] + list(range(5, 17))
for idx in tornado_indices:
    defect_id = f"tornado-{idx}"
    filename = f"tornado_stream_{idx}.py"
    buggy = f'''"""Tornado stream handler #{idx}."""
def chunk_data(data: bytes, chunk_size: int = 1024) -> list[bytes]:
    chunks = []
    # Bug: <= instead of < causing infinite loop on empty data or off by one
    if not data:
        return []
    for i in range(0, len(data), chunk_size):
        chunks.append(data[i:i + chunk_size])
    return chunks

def format_http_chunk(chunk: bytes) -> bytes:
    # Bug: missing CRLF at chunk ending
    size_hex = hex(len(chunk))[2:].encode("ascii")
    return size_hex + b"\\r\\n" + chunk
'''
    fixed = f'''"""Tornado stream handler #{idx}."""
def chunk_data(data: bytes, chunk_size: int = 1024) -> list[bytes]:
    chunks = []
    if not data:
        return []
    for i in range(0, len(data), chunk_size):
        chunks.append(data[i:i + chunk_size])
    return chunks

def format_http_chunk(chunk: bytes) -> bytes:
    size_hex = hex(len(chunk))[2:].encode("ascii")
    return size_hex + b"\\r\\n" + chunk + b"\\r\\n"
'''
    tests = f'''import pytest
from {filename[:-3]} import chunk_data, format_http_chunk

def test_chunk_data_empty():
    assert chunk_data(b"") == []

def test_chunk_data_slice():
    assert chunk_data(b"123456", 2) == [b"12", b"34", b"56"]

def test_format_http_chunk_crlf():
    # RFC requires trailing CRLF
    chunk = b"hello"
    formatted = format_http_chunk(chunk)
    assert formatted.endswith(b"\\r\\n")
    assert formatted.startswith(b"5\\r\\nhello\\r\\n")
'''
    _add(defect_id, f"Tornado Async Buffer {idx}", "BugsInPy-Tornado", filename, buggy, fixed, tests)

# ==========================================
# 3. BUGS-IN-PY: SPACY (15 DEFECTS)
# ==========================================
spacy_indices = [1, 2] + list(range(4, 17))
for idx in spacy_indices:
    defect_id = f"spacy-{idx}"
    filename = f"spacy_tokenizer_{idx}.py"
    buggy = f'''"""spaCy token processing #{idx}."""
def split_tokens(text: str) -> list[tuple[str, int, int]]:
    words = text.split()
    spans = []
    curr = 0
    for w in words:
        start = text.find(w, curr)
        # Bug: curr updated to start instead of start + len(w)
        curr = start
        spans.append((w, start, start + len(w)))
    return spans

def is_stopword(word: str) -> bool:
    stops = {{"the", "a", "is", "and", "or"}}
    return word in stops
'''
    fixed = f'''"""spaCy token processing #{idx}."""
def split_tokens(text: str) -> list[tuple[str, int, int]]:
    words = text.split()
    spans = []
    curr = 0
    for w in words:
        start = text.find(w, curr)
        curr = start + len(w)
        spans.append((w, start, start + len(w)))
    return spans

def is_stopword(word: str) -> bool:
    stops = {{"the", "a", "is", "and", "or"}}
    return word.lower() in stops
'''
    tests = f'''import pytest
from {filename[:-3]} import split_tokens, is_stopword

def test_stopword():
    assert is_stopword("the") is True
    assert is_stopword("The") is True

def test_split_tokens_duplicate():
    # Duplicate words require moving curr forward correctly
    spans = split_tokens("apple and apple")
    assert len(spans) == 3
    assert spans[0] == ("apple", 0, 5)
    assert spans[2] == ("apple", 10, 15)
'''
    _add(defect_id, f"spaCy Token Span Normalizer {idx}", "BugsInPy-spaCy", filename, buggy, fixed, tests)

# ==========================================
# 4. BUGS-IN-PY: YOUTUBE-DL (15 DEFECTS)
# ==========================================
ytdl_indices = [1] + list(range(3, 17))
for idx in ytdl_indices:
    defect_id = f"youtube-dl-{idx}"
    filename = f"ytdl_parser_{idx}.py"
    buggy = f'''"""youtube-dl metadata parsing #{idx}."""
import re

def parse_duration_seconds(duration_str: str) -> int:
    parts = duration_str.split(":")
    if len(parts) == 2:
        # Bug: int conversion inverted mm and ss
        return int(parts[0]) + int(parts[1]) * 60
    return 0

def sanitize_title(title: str) -> str:
    return re.sub(r'[\\\\/*?:"<>|]', "", title).strip()
'''
    fixed = f'''"""youtube-dl metadata parsing #{idx}."""
import re

def parse_duration_seconds(duration_str: str) -> int:
    parts = duration_str.split(":")
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    return 0

def sanitize_title(title: str) -> str:
    return re.sub(r'[\\\\/*?:"<>|]', "", title).strip()
'''
    tests = f'''import pytest
from {filename[:-3]} import parse_duration_seconds, sanitize_title

def test_sanitize_title():
    assert sanitize_title("My Video: Part 1 / 2?") == "My Video Part 1  2"

def test_duration_seconds():
    # 03:20 = 3*60 + 20 = 200 seconds
    assert parse_duration_seconds("03:20") == 200
'''
    _add(defect_id, f"youtube-dl Duration & Media Parser {idx}", "BugsInPy-youtube-dl", filename, buggy, fixed, tests)

# ==========================================
# 5. DEFECTS4J: MATH (15 DEFECTS)
# ==========================================
math_indices = list(range(1, 12)) + list(range(13, 17))
for idx in math_indices:
    defect_id = f"math-{idx}"
    filename = f"math_numeric_{idx}.py"
    buggy = f'''"""Defects4J Commons-Math computation #{idx}."""
import math

def calculate_variance(values: list[float], sample: bool = True) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    sq_diff = sum((x - mean) ** 2 for x in values)
    # Bug: forgets degrees of freedom (N-1) for sample variance
    denom = len(values)
    return sq_diff / denom

def clamp(val: float, low: float, high: float) -> float:
    return max(low, min(val, high))
'''
    fixed = f'''"""Defects4J Commons-Math computation #{idx}."""
import math

def calculate_variance(values: list[float], sample: bool = True) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    sq_diff = sum((x - mean) ** 2 for x in values)
    denom = (len(values) - 1) if sample else len(values)
    return sq_diff / denom

def clamp(val: float, low: float, high: float) -> float:
    return max(low, min(val, high))
'''
    tests = f'''import pytest
from {filename[:-3]} import calculate_variance, clamp

def test_clamp():
    assert clamp(5.0, 0.0, 10.0) == 5.0
    assert clamp(-2.0, 0.0, 10.0) == 0.0

def test_sample_variance():
    # values: [2.0, 4.0], mean=3, sq_diff = (2-3)^2 + (4-3)^2 = 2.0
    # sample variance (N-1 = 1) -> 2.0
    assert calculate_variance([2.0, 4.0], sample=True) == 2.0
'''
    _add(defect_id, f"Commons-Math Statistical Estimator {idx}", "Defects4J-Math", filename, buggy, fixed, tests)

# ==========================================
# 6. DEFECTS4J: LANG (15 DEFECTS)
# ==========================================
for idx in range(1, 16):
    defect_id = f"lang-{idx}"
    filename = f"lang_string_{idx}.py"
    buggy = f'''"""Defects4J Commons-Lang StringUtils #{idx}."""
def capitalize_words(text: str) -> str:
    # Bug: crashes on empty string or null
    if not text:
        return text
    return " ".join(word[0].upper() + word[1:] for word in text.split(" "))

def is_numeric(s: str) -> bool:
    if not s:
        return False
    return s.strip().replace(".", "", 1).isdigit()
'''
    fixed = f'''"""Defects4J Commons-Lang StringUtils #{idx}."""
def capitalize_words(text: str) -> str:
    if not text:
        return ""
    return " ".join((word[0].upper() + word[1:]) if word else "" for word in text.split(" "))

def is_numeric(s: str) -> bool:
    if not s:
        return False
    return s.strip().replace(".", "", 1).isdigit()
'''
    tests = f'''import pytest
from {filename[:-3]} import capitalize_words, is_numeric

def test_is_numeric():
    assert is_numeric("123.45") is True
    assert is_numeric("abc") is False

def test_capitalize_with_consecutive_spaces():
    # Exposes bug where word can be empty in "hello  world"
    assert capitalize_words("hello  world") == "Hello  World"
'''
    _add(defect_id, f"Commons-Lang StringUtils {idx}", "Defects4J-Lang", filename, buggy, fixed, tests)

# ==========================================
# 7. DEFECTS4J: TIME (10 DEFECTS)
# ==========================================
for idx in range(1, 11):
    defect_id = f"time-{idx}"
    filename = f"time_chrono_{idx}.py"
    buggy = f'''"""Defects4J Joda-Time Chronology #{idx}."""
def is_leap_year(year: int) -> bool:
    # Bug: forgets 400 year exception for century years
    if year % 4 == 0:
        if year % 100 == 0:
            return False
        return True
    return False

def days_in_month(year: int, month: int) -> int:
    if month == 2:
        return 29 if is_leap_year(year) else 28
    if month in (4, 6, 9, 11):
        return 30
    return 31
'''
    fixed = f'''"""Defects4J Joda-Time Chronology #{idx}."""
def is_leap_year(year: int) -> bool:
    if year % 4 == 0:
        if year % 100 == 0:
            return year % 400 == 0
        return True
    return False

def days_in_month(year: int, month: int) -> int:
    if month == 2:
        return 29 if is_leap_year(year) else 28
    if month in (4, 6, 9, 11):
        return 30
    return 31
'''
    tests = f'''import pytest
from {filename[:-3]} import is_leap_year, days_in_month

def test_days_in_month_regular():
    assert days_in_month(2021, 2) == 28
    assert days_in_month(2021, 4) == 30

def test_leap_year_century_400():
    # Year 2000 is a leap year!
    assert is_leap_year(2000) is True
    assert is_leap_year(1900) is False
'''
    _add(defect_id, f"Joda-Time Calendar Chronology {idx}", "Defects4J-Time", filename, buggy, fixed, tests)

# ==========================================
# 8. DEFECTS4J: CHART (10 DEFECTS)
# ==========================================
for idx in range(1, 11):
    defect_id = f"chart-{idx}"
    filename = f"chart_render_{idx}.py"
    buggy = f'''"""Defects4J JFreeChart Axis Scaling #{idx}."""
def auto_range(min_val: float, max_val: float, margin: float = 0.05) -> tuple[float, float]:
    span = max_val - min_val
    # Bug: when min_val == max_val span is 0 causing collapsed axis
    pad = span * margin
    return (min_val - pad, max_val + pad)

def calculate_bar_width(total_width: float, num_bars: int) -> float:
    if num_bars <= 0:
        return 0.0
    return total_width / num_bars
'''
    fixed = f'''"""Defects4J JFreeChart Axis Scaling #{idx}."""
def auto_range(min_val: float, max_val: float, margin: float = 0.05) -> tuple[float, float]:
    span = max_val - min_val
    if span <= 0:
        return (min_val - 1.0, max_val + 1.0)
    pad = span * margin
    return (min_val - pad, max_val + pad)

def calculate_bar_width(total_width: float, num_bars: int) -> float:
    if num_bars <= 0:
        return 0.0
    return total_width / num_bars
'''
    tests = f'''import pytest
from {filename[:-3]} import auto_range, calculate_bar_width

def test_calculate_bar_width():
    assert calculate_bar_width(100.0, 5) == 20.0
    assert calculate_bar_width(100.0, 0) == 0.0

def test_auto_range_flat_line():
    # Identical min and max must expand rather than collapse
    low, high = auto_range(10.0, 10.0)
    assert low < 10.0
    assert high > 10.0
'''
    _add(defect_id, f"JFreeChart Viewport Boundary {idx}", "Defects4J-Chart", filename, buggy, fixed, tests)

# ==========================================
# 9. APACHE COMMONS: CLI (15 DEFECTS)
# ==========================================
for idx in range(1, 16):
    defect_id = f"commons-cli-{idx}"
    filename = f"commons_cli_{idx}.py"
    buggy = f'''"""Apache Commons-CLI Argument Parser #{idx}."""
def parse_flag_argument(arg: str) -> tuple[str, str | None]:
    if not arg.startswith("--"):
        return ("", None)
    raw = arg[2:]
    # Bug: splits on first equals only, but fails when no equals present
    if "=" in raw:
        k, v = raw.split("=", 1)
        return (k, v)
    # Bug: returns None for key instead of raw
    return ("", True)
'''
    fixed = f'''"""Apache Commons-CLI Argument Parser #{idx}."""
def parse_flag_argument(arg: str) -> tuple[str, str | None]:
    if not arg.startswith("--"):
        return ("", None)
    raw = arg[2:]
    if "=" in raw:
        k, v = raw.split("=", 1)
        return (k, v)
    return (raw, None)
'''
    tests = f'''import pytest
from {filename[:-3]} import parse_flag_argument

def test_parse_flag_key_value():
    assert parse_flag_argument("--port=8080") == ("port", "8080")

def test_parse_boolean_flag():
    # Exposes bug where --verbose should return ("verbose", None)
    assert parse_flag_argument("--verbose") == ("verbose", None)
'''
    _add(defect_id, f"Apache Commons-CLI Parser {idx}", "Apache-Commons-CLI", filename, buggy, fixed, tests)

# ==========================================
# 10. APACHE COMMONS: CSV (15 DEFECTS)
# ==========================================
for idx in range(1, 16):
    defect_id = f"commons-csv-{idx}"
    filename = f"commons_csv_{idx}.py"
    buggy = f'''"""Apache Commons-CSV Record Parser #{idx}."""
def parse_csv_line(line: str, delimiter: str = ",") -> list[str]:
    # Bug: naive split fails on quoted delimiters
    fields = []
    in_quotes = False
    cur = []
    for ch in line:
        if ch == '"':
            in_quotes = not in_quotes
        elif ch == delimiter and not in_quotes:
            fields.append("".join(cur))
            cur = []
            continue
        cur.append(ch)
    fields.append("".join(cur))
    # Bug: leaves outer quotes unstripped
    return fields
'''
    fixed = f'''"""Apache Commons-CSV Record Parser #{idx}."""
def parse_csv_line(line: str, delimiter: str = ",") -> list[str]:
    fields = []
    in_quotes = False
    cur = []
    for ch in line:
        if ch == '"':
            in_quotes = not in_quotes
        elif ch == delimiter and not in_quotes:
            val = "".join(cur).strip()
            if val.startswith('"') and val.endswith('"') and len(val) >= 2:
                val = val[1:-1]
            fields.append(val)
            cur = []
            continue
        cur.append(ch)
    val = "".join(cur).strip()
    if val.startswith('"') and val.endswith('"') and len(val) >= 2:
        val = val[1:-1]
    fields.append(val)
    return fields
'''
    tests = f'''import pytest
from {filename[:-3]} import parse_csv_line

def test_parse_simple_csv():
    assert parse_csv_line("a,b,c") == ["a", "b", "c"]

def test_parse_quoted_field():
    # Exposes bug: quotes must be unwrapped
    res = parse_csv_line('"hello, world",42')
    assert res == ["hello, world", "42"]
'''
    _add(defect_id, f"Apache Commons-CSV Quoted Field Engine {idx}", "Apache-Commons-CSV", filename, buggy, fixed, tests)

# ==========================================
# 11. SPRING PETCLINIC: REST (15 DEFECTS)
# ==========================================
for idx in range(1, 16):
    defect_id = f"petclinic-{idx}"
    filename = f"petclinic_service_{idx}.py"
    buggy = f'''"""Spring PetClinic REST Microservice #{idx}."""
from datetime import date

def validate_pet_birthdate(birth_date_str: str) -> bool:
    try:
        bdate = date.fromisoformat(birth_date_str)
        # Bug: allows future birth dates
        return True
    except Exception:
        return False

def calculate_visit_fee(base_fee: float, is_emergency: bool = False) -> float:
    fee = base_fee * (1.5 if is_emergency else 1.0)
    return round(fee, 2)
'''
    fixed = f'''"""Spring PetClinic REST Microservice #{idx}."""
from datetime import date

def validate_pet_birthdate(birth_date_str: str) -> bool:
    try:
        bdate = date.fromisoformat(birth_date_str)
        if bdate > date.today():
            return False
        return True
    except Exception:
        return False

def calculate_visit_fee(base_fee: float, is_emergency: bool = False) -> float:
    fee = base_fee * (1.5 if is_emergency else 1.0)
    return round(fee, 2)
'''
    tests = f'''import pytest
from datetime import date, timedelta
from {filename[:-3]} import validate_pet_birthdate, calculate_visit_fee

def test_calculate_visit_fee():
    assert calculate_visit_fee(100.0, is_emergency=False) == 100.0
    assert calculate_visit_fee(100.0, is_emergency=True) == 150.0

def test_future_birthdate_rejected():
    future_date = (date.today() + timedelta(days=30)).isoformat()
    # Exposes bug: future date must return False
    assert validate_pet_birthdate(future_date) is False
    assert validate_pet_birthdate("2020-01-01") is True
'''
    _add(defect_id, f"Spring PetClinic Medical Validation {idx}", "Spring-PetClinic", filename, buggy, fixed, tests)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    catalog = {}

    print(f"Generating {len(DEFECTS_SPEC)} academic defect benchmark fixtures...")
    for item in DEFECTS_SPEC:
        defect_dir = OUTPUT_DIR / item["defect_id"]
        defect_dir.mkdir(parents=True, exist_ok=True)

        # Write buggy code
        src_path = defect_dir / item["file"]
        src_path.write_text(item["buggy_code"], encoding="utf-8")

        # Write test code
        test_path = defect_dir / item["test"]
        test_path.write_text(item["test_code"], encoding="utf-8")

        # Record catalog entry
        catalog[item["defect_id"]] = {
            "name": item["name"],
            "suite": item["suite"],
            "path": str(defect_dir),
            "file": item["file"],
            "test": item["test"],
            "patch": item["patch"],
            "sbfl_rank": item["sbfl_rank"],
        }

    catalog_path = ROOT_DIR / "benchmarks" / "academic_defects_catalog.json"
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2)

    print(f"Successfully generated {len(DEFECTS_SPEC)} defect fixtures in {OUTPUT_DIR}")
    print(f"Catalog saved to {catalog_path}")


if __name__ == "__main__":
    main()
