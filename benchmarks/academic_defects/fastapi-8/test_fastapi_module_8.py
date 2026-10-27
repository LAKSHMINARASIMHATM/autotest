import pytest
from fastapi_module_8 import paginate

def test_paginate_first_page():
    data = [1, 2, 3, 4, 5]
    # Page 1 with size 2 should return [1, 2]
    assert paginate(data, 1, 2) == [1, 2]

def test_paginate_empty():
    assert paginate([], 1, 10) == []
