import pytest
from spacy_tokenizer_6 import split_tokens, is_stopword

def test_stopword():
    assert is_stopword("the") is True
    assert is_stopword("The") is True

def test_split_tokens_duplicate():
    # Duplicate words require moving curr forward correctly
    spans = split_tokens("apple and apple")
    assert len(spans) == 3
    assert spans[0] == ("apple", 0, 5)
    assert spans[2] == ("apple", 10, 15)
