"""FastAPI pagination #14."""
def paginate(items: list, page: int, size: int) -> list:
    # Bug: 0-indexed calculation error
    start = page * size
    end = start + size
    return items[start:end]
