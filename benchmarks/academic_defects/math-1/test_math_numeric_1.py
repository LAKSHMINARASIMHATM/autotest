import pytest
from math_numeric_1 import calculate_variance, clamp

def test_clamp():
    assert clamp(5.0, 0.0, 10.0) == 5.0
    assert clamp(-2.0, 0.0, 10.0) == 0.0

def test_sample_variance():
    # values: [2.0, 4.0], mean=3, sq_diff = (2-3)^2 + (4-3)^2 = 2.0
    # sample variance (N-1 = 1) -> 2.0
    assert calculate_variance([2.0, 4.0], sample=True) == 2.0
