"""FastAPI header parsing #13."""
def normalize_header_name(header: str) -> str:
    # Bug: only replaces underscores, forgets lowercasing
    return header.replace("_", "-")

def get_content_length(headers: dict) -> int:
    for k, v in headers.items():
        if normalize_header_name(k) == "content-length":
            return int(v)
    return 0
