import pytest
from chart_render_8 import auto_range, calculate_bar_width

def test_calculate_bar_width():
    assert calculate_bar_width(100.0, 5) == 20.0
    assert calculate_bar_width(100.0, 0) == 0.0

def test_auto_range_flat_line():
    # Identical min and max must expand rather than collapse
    low, high = auto_range(10.0, 10.0)
    assert low < 10.0
    assert high > 10.0
