"""Exact RAB arithmetic. All API monetary values must be decimal strings."""

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, localcontext
from typing import Iterable


def decimal_input(value: str, *, positive: bool = False) -> Decimal:
    if not isinstance(value, str) or len(value) > 40:
        raise ValueError("Expected a decimal string of at most 40 characters")
    try:
        result = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError("Invalid decimal") from exc
    if not result.is_finite() or result < 0 or (positive and result == 0):
        raise ValueError("Expected a finite nonnegative decimal (positive quantity)")
    # Bound arithmetic and eventual NUMERIC storage, including exponent notation.
    if result > Decimal("999999999999999.9999") or result.as_tuple().exponent < -4:
        raise ValueError("Decimal exceeds supported precision or range")
    return result


@dataclass(frozen=True)
class BudgetLine:
    name: str
    category: str
    quantity: str
    unit: str
    unit_price: str
    notes: str = ""

    def __post_init__(self) -> None:
        if not self.name.strip() or not self.unit.strip():
            raise ValueError("Name and unit are required")
        decimal_input(self.quantity, positive=True)
        decimal_input(self.unit_price)

    @property
    def total_rupiah(self) -> int:
        # Round each line once to rupiah; the grand total sums displayed lines.
        with localcontext() as context:
            context.prec = 50
            total = decimal_input(self.quantity, positive=True) * decimal_input(self.unit_price)
            return int(total.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def total_rupiah(lines: Iterable[BudgetLine]) -> int:
    return sum(line.total_rupiah for line in lines)
