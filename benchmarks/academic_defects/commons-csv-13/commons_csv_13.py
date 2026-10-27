"""Apache Commons-CSV Record Parser #13."""
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
