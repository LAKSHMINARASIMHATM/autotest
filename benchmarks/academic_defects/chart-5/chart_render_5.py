"""Defects4J JFreeChart Axis Scaling #5."""
def auto_range(min_val: float, max_val: float, margin: float = 0.05) -> tuple[float, float]:
    span = max_val - min_val
    # Bug: when min_val == max_val span is 0 causing collapsed axis
    pad = span * margin
    return (min_val - pad, max_val + pad)

def calculate_bar_width(total_width: float, num_bars: int) -> float:
    if num_bars <= 0:
        return 0.0
    return total_width / num_bars
