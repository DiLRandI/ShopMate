import {calculateTotals, parseMoney, type TotalsInputLine} from "./utils";
import {describe, expect, it} from "vitest";

describe("pos utils", () => {
  it("parses money strings", () => {
    expect(parseMoney("10.50")).toBe(1050);
    expect(parseMoney("abc")).toBe(0);
  });

  it("computes totals", () => {
    const lines: TotalsInputLine[] = [
      {unitPriceCents: 1000, quantity: 2, lineDiscountCents: 0, taxRatePercent: 5},
      {unitPriceCents: 500, quantity: 1, lineDiscountCents: 100, taxRatePercent: 0},
    ];
    const totals = calculateTotals(lines, 200);
    expect(totals.subtotal).toBe(2500);
    expect(totals.orderDiscount).toBe(200);
    expect(totals.tax).toBe(100);
    expect(totals.total).toBe(2400);
  });
});
