"""Tornado stream handler #5."""
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
    return size_hex + b"\r\n" + chunk
