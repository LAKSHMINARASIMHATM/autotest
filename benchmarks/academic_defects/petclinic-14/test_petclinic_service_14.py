import pytest
from datetime import date, timedelta
from petclinic_service_14 import validate_pet_birthdate, calculate_visit_fee

def test_calculate_visit_fee():
    assert calculate_visit_fee(100.0, is_emergency=False) == 100.0
    assert calculate_visit_fee(100.0, is_emergency=True) == 150.0

def test_future_birthdate_rejected():
    future_date = (date.today() + timedelta(days=30)).isoformat()
    # Exposes bug: future date must return False
    assert validate_pet_birthdate(future_date) is False
    assert validate_pet_birthdate("2020-01-01") is True
