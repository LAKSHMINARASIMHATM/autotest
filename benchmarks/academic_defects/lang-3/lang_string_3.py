"""Defects4J Commons-Lang StringUtils #3."""
def capitalize_words(text: str) -> str:
    # Bug: crashes on empty string or null
    if not text:
        return text
    return " ".join(word[0].upper() + word[1:] for word in text.split(" "))

def is_numeric(s: str) -> bool:
    if not s:
        return False
    return s.strip().replace(".", "", 1).isdigit()
