"""Defects4J Joda-Time Chronology #6."""
def is_leap_year(year: int) -> bool:
    # Bug: forgets 400 year exception for century years
    if year % 4 == 0:
        if year % 100 == 0:
            return False
        return True
    return False

def days_in_month(year: int, month: int) -> int:
    if month == 2:
        return 29 if is_leap_year(year) else 28
    if month in (4, 6, 9, 11):
        return 30
    return 31
