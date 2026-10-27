"""Defects4J Commons-Math computation #7."""
import math

def calculate_variance(values: list[float], sample: bool = True) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    sq_diff = sum((x - mean) ** 2 for x in values)
    # Bug: forgets degrees of freedom (N-1) for sample variance
    denom = len(values)
    return sq_diff / denom

def clamp(val: float, low: float, high: float) -> float:
    return max(low, min(val, high))
