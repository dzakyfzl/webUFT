from decimal import localcontext
import unittest

from app.budgets.money import BudgetLine, total_rupiah


class BudgetTest(unittest.TestCase):
    def line(self, quantity="1", price="1000"):
        return BudgetLine("Kertas", "Perlengkapan", quantity, "pak", price)

    def test_fractional_quantity_and_prices_use_exact_rounding(self):
        self.assertEqual(self.line("2.5", "1000.2").total_rupiah, 2501)
        self.assertEqual(self.line("3", "0.1").total_rupiah, 0)
        self.assertEqual(self.line("1", "0.5").total_rupiah, 1)

    def test_total_matches_sum_of_displayed_rows(self):
        lines = (self.line("1", "0.5"), self.line("1", "0.5"))
        self.assertEqual(total_rupiah(iter(lines)), 2)
        self.assertEqual(total_rupiah([]), 0)

    def test_free_items_are_valid_but_zero_quantity_is_not(self):
        self.assertEqual(self.line(price="0").total_rupiah, 0)
        with self.assertRaises(ValueError):
            self.line(quantity="0")

    def test_nonfinite_negative_float_and_excessive_values_rejected(self):
        for value in ("NaN", "sNaN", "Infinity", "-Infinity", "-1", "garbage", "",
                      "1e100000", "0.00001", "1000000000000000", 1.5):
            for field in ("quantity", "price"):
                with self.subTest(value=value, field=field), self.assertRaises(ValueError):
                    self.line(**{field: value})

    def test_calculation_is_independent_of_callers_decimal_context(self):
        with localcontext() as context:
            context.prec = 6
            self.assertEqual(self.line("999999999999999", "999999999999999").total_rupiah,
                             999999999999998000000000000001)


if __name__ == "__main__":
    unittest.main()
