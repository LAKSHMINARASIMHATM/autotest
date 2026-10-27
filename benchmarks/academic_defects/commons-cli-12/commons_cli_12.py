"""Apache Commons-CLI Argument Parser #12."""
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
