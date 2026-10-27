import pytest
from tornado_stream_6 import chunk_data, format_http_chunk

def test_chunk_data_empty():
    assert chunk_data(b"") == []

def test_chunk_data_slice():
    assert chunk_data(b"123456", 2) == [b"12", b"34", b"56"]

def test_format_http_chunk_crlf():
    # RFC requires trailing CRLF
    chunk = b"hello"
    formatted = format_http_chunk(chunk)
    assert formatted.endswith(b"\r\n")
    assert formatted.startswith(b"5\r\nhello\r\n")
