"""Real-world tiered pricing calculation engine with tax and discount codes.
Modeled after Defects4J / Commons-Math precision and boundary defects.
"""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP


class PricingError(Exception):
    pass


class PricingEngine:
    """Calculates order totals, applying tiered volume discounts, promo codes, and regional sales tax."""

    DISCOUNT_CODES = {
        "WELCOME10": Decimal("0.10"),
        "AUTOTEST25": Decimal("0.25"),
        "VIP50": Decimal("0.50"),
    }

    @classmethod
    def calculate_order_total(
        cls,
        subtotal: float,
        discount_code: str | None = None,
        tax_rate: float = 0.08,
    ) -> dict[str, float]:
        if subtotal < 0:
            raise PricingError("Subtotal cannot be negative")

        sub_dec = Decimal(str(subtotal))
        tax_dec = Decimal(str(tax_rate))

        # Determine discount fraction
        disc_pct = Decimal("0.0")
        if discount_code:
            code = discount_code.upper().strip()
            if code not in cls.DISCOUNT_CODES:
                raise PricingError(f"Invalid discount code: '{discount_code}'")
            disc_pct = cls.DISCOUNT_CODES[code]

        # Automatic volume discount tier
        if sub_dec >= Decimal("500.00"):
            disc_pct = max(disc_pct, Decimal("0.15"))
        elif sub_dec >= Decimal("200.00"):
            disc_pct = max(disc_pct, Decimal("0.05"))

        # BUG: Computes discount amount AFTER adding tax instead of on original subtotal!
        # Statutory accounting requires: Discount applied on pre-tax subtotal.
        taxed_subtotal = sub_dec * (Decimal("1.0") + tax_dec)
        discount_amount = taxed_subtotal * disc_pct
        tax_amount = sub_dec * tax_dec
        final_total = (sub_dec - discount_amount) + tax_amount

        # Round to 2 decimal places
        final_cents = final_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        disc_cents = discount_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        tax_cents = tax_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        return {
            "subtotal": float(sub_dec),
            "discount_applied": float(disc_cents),
            "tax": float(tax_cents),
            "total": float(final_cents),
        }
