"""spaCy token processing #16."""
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
    stops = {"the", "a", "is", "and", "or"}
    return word in stops
