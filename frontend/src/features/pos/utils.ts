export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD"
  });
}

export function parseMoney(value: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100);
}

export type TotalsInputLine = {
  unitPriceCents: number;
  quantity: number;
  lineDiscountCents: number;
  taxRatePercent: number;
};

export type Totals = {
  subtotal: number;
  orderDiscount: number;
  tax: number;
  total: number;
};

export function calculateTotals(lines: TotalsInputLine[], orderDiscountCents: number): Totals {
  let subtotal = 0;
  let tax = 0;

  for (const line of lines) {
    if (line.quantity <= 0) continue;
    const lineSubtotal = line.unitPriceCents * line.quantity;
    const lineDiscount = Math.min(line.lineDiscountCents, lineSubtotal);
    const taxable = lineSubtotal - lineDiscount;
    const lineTax = Math.round(taxable * (line.taxRatePercent / 100));
    subtotal += lineSubtotal;
    tax += lineTax;
  }

  const effectiveOrderDiscount = Math.min(orderDiscountCents, subtotal);
  const total = subtotal - effectiveOrderDiscount + tax;

  return {
    subtotal,
    orderDiscount: effectiveOrderDiscount,
    tax,
    total,
  };
}
