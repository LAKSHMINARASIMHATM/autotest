import pytest
from time_chrono_1 import is_leap_year, days_in_month

def test_days_in_month_regular():
    assert days_in_month(2021, 2) == 28
    assert days_in_month(2021, 4) == 30

def test_leap_year_century_400():
    # Year 2000 is a leap year!
    assert is_leap_year(2000) is True
    assert is_leap_year(1900) is False
