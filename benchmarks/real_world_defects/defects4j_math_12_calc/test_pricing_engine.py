"""PyTest suite for PricingEngine — verifies pre-tax discount rules, volume tiers, and exceptions."""
import pytest
from pricing_engine import PricingEngine, PricingError


def test_standard_order_without_discount():
    res = PricingEngine.calculate_order_total(subtotal=100.0, tax_rate=0.08)
    assert res["subtotal"] == 100.0
    assert res["discount_applied"] == 0.0
    assert res["tax"] == 8.0
    assert res["total"] == 108.0


def test_pre_tax_discount_calculation():
    """Real-world defect: Discount MUST be calculated on pre-tax subtotal ($100 * 10% = $10.00)."""
    res = PricingEngine.calculate_order_total(subtotal=100.0, discount_code="WELCOME10", tax_rate=0.08)
    # Pre-tax discount: $10.00, Tax on pre-tax: $8.00, Total: $100 - $10 + $8 = $98.00
    assert res["discount_applied"] == 10.00
    assert res["tax"] == 8.00
    assert res["total"] == 98.00


def test_negative_subtotal_rejected():
    with pytest.raises(PricingError, match="Subtotal cannot be negative"):
        PricingEngine.calculate_order_total(subtotal=-25.0)


def test_invalid_discount_code_rejected():
    with pytest.raises(PricingError, match="Invalid discount code"):
        PricingEngine.calculate_order_total(subtotal=50.0, discount_code="NONEXISTENT")


def test_volume_tier_auto_applied():
    res = PricingEngine.calculate_order_total(subtotal=600.0, tax_rate=0.10)
    # 15% tier = $90 discount, $60 tax, Total = $570
    assert res["discount_applied"] == 90.00
    assert res["tax"] == 60.00
    assert res["total"] == 570.00
