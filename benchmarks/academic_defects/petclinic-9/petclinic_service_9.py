"""Spring PetClinic REST Microservice #9."""
from datetime import date

def validate_pet_birthdate(birth_date_str: str) -> bool:
    try:
        bdate = date.fromisoformat(birth_date_str)
        # Bug: allows future birth dates
        return True
    except Exception:
        return False

def calculate_visit_fee(base_fee: float, is_emergency: bool = False) -> float:
    fee = base_fee * (1.5 if is_emergency else 1.0)
    return round(fee, 2)
