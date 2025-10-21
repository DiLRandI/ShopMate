import {useEffect, useMemo, useState} from "react";
import type {ProductView} from "@/features/products/api";
import {fetchProducts} from "@/features/products/api";
import {buildCreateSaleRequest, createSale} from "@/features/pos/api";
import type {Sale} from "@/features/pos/api";
import {InvoiceDialog} from "@/features/pos/components/InvoiceDialog";
import {calculateTotals, formatCurrency, parseMoney, type TotalsInputLine} from "@/features/pos/utils";

type CartLine = {
  product: ProductView;
  quantity: number;
  lineDiscount: string;
};

// TODO(#POS-42): Support applying customer-specific pricing tiers during cart calculations.

const paymentOptions = ["Cash", "Card", "Wallet/UPI"] as const;

function generateSaleNumber(): string {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
}

type PosPageProps = {
  onInventoryChanged?: () => Promise<void> | void;
};

export function PosPage({onInventoryChanged}: PosPageProps) {
  const [products, setProducts] = useState<ProductView[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentOptions)[number]>("Cash");
  const [orderDiscount, setOrderDiscount] = useState("0.00");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<Sale | null>(null);

  useEffect(() => {
    fetchProducts()
      .then(async items => {
        setProducts(items);
        if (onInventoryChanged) {
          await onInventoryChanged();
        }
      })
      .catch(() => setError("Unable to load products."))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) {
      return products.slice(0, 20);
    }
    const query = search.trim().toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [products, search]);

  const totals = useMemo(() => {
    const lines: TotalsInputLine[] = cart.map(line => ({
      unitPriceCents: line.product.unitPriceCents,
      quantity: line.quantity,
      lineDiscountCents: Math.min(parseMoney(line.lineDiscount), line.product.unitPriceCents * line.quantity),
      taxRatePercent: line.product.taxRate,
    }));
    return calculateTotals(lines, parseMoney(orderDiscount));
  }, [cart, orderDiscount]);

  function handleAddToCart(product: ProductView) {
    setCart(prev => {
      const existing = prev.find(line => line.product.id === product.id);
      if (existing) {
        return prev.map(line => line.product.id === product.id ? {...line, quantity: line.quantity + 1} : line);
      }
      return [...prev, {product, quantity: 1, lineDiscount: "0.00"}];
    });
  }

  function handleQuantityChange(productID: number, value: string) {
    const qty = Number.parseInt(value, 10);
    if (Number.isNaN(qty) || qty < 0) {
      return;
    }
    setCart(prev => prev.map(line => line.product.id === productID ? {...line, quantity: qty} : line));
  }

  function handleLineDiscountChange(productID: number, value: string) {
    setCart(prev => prev.map(line => line.product.id === productID ? {...line, lineDiscount: value} : line));
  }

  function handleRemoveLine(productID: number) {
    setCart(prev => prev.filter(line => line.product.id !== productID));
  }

  async function handleSubmit() {
    setError(null);
    if (cart.length === 0) {
      setError("Add at least one product before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const saleNumber = generateSaleNumber();
      const orderDiscountCents = Math.min(parseMoney(orderDiscount), totals.subtotal);

      const lines = cart
        .filter(line => line.quantity > 0)
        .map(line => {
          const discountCents = Math.min(parseMoney(line.lineDiscount), line.product.unitPriceCents * line.quantity);
          return {
            productId: line.product.id,
            quantity: line.quantity,
            discountCents,
          };
        });

      if (lines.length === 0) {
        setError("All cart items have zero quantity.");
        setIsSubmitting(false);
        return;
      }

      const request = buildCreateSaleRequest({
        saleNumber,
        customerName: customerName.trim(),
        paymentMethod,
        discountCents: orderDiscountCents,
        note: "",
        lines,
      });

      const sale = await createSale(request);

      setInvoice(sale);
      setCart([]);
      setOrderDiscount("0.00");
      setCustomerName("");
      setError(null);

      const updated = await fetchProducts();
      setProducts(updated);
      if (onInventoryChanged) {
        await onInventoryChanged();
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeInvoice() {
    setInvoice(null);
  }

  if (isLoading) {
    return <p>Loading POS…</p>;
  }

  return (
    <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Products</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Search inventory and add items to the current sale.</p>
          </div>
          <div className="w-full sm:w-80">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by name or SKU"
            />
          </div>
        </header>

        <div className="max-h-[28rem] overflow-y-auto pr-2 scrollbar-thin">
          {filteredProducts.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              No products match that search.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map(product => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className="flex w-full flex-col items-start justify-between gap-3 rounded-2xl border border-transparent bg-blue-50/70 px-4 py-3 text-left transition hover:border-brand-primary hover:bg-white hover:shadow focus:outline-none focus:ring-2 focus:ring-brand-primary/50 dark:bg-slate-800/70 dark:hover:bg-slate-800"
                  >
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{product.name}</h3>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">SKU: {product.sku}</p>
                    </div>
                    <div className="flex w-full items-center justify-between">
                      <span className="text-sm font-semibold text-brand-primary dark:text-blue-200">{formatCurrency(product.unitPriceCents)}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-primary shadow-sm dark:bg-slate-900">Add to cart</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Cart</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Adjust quantities, apply discounts, and review totals.</p>
        </div>

        {cart.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
            Scan or search items to begin building the invoice.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-separate border-spacing-y-2 text-left text-sm text-slate-700 dark:text-slate-200">
              <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pl-3 pr-2">Item</th>
                  <th className="px-2">Qty</th>
                  <th className="px-2 text-right">Price</th>
                  <th className="px-2">Discount</th>
                  <th className="px-2 text-right">Tax %</th>
                  <th className="px-2 text-right">Total</th>
                  <th className="px-2 text-right"/>
                </tr>
              </thead>
              <tbody>
                {cart.map(line => {
                  const subtotal = line.product.unitPriceCents * line.quantity;
                  const discountCents = Math.min(parseMoney(line.lineDiscount), subtotal);
                  const taxableBase = subtotal - discountCents;
                  const taxCents = Math.round(taxableBase * (line.product.taxRate / 100));
                  const totalCents = taxableBase + taxCents;

                  return (
                    <tr key={line.product.id} className="rounded-xl bg-slate-50/80 align-top shadow-sm dark:bg-slate-800/60">
                      <td className="rounded-l-xl px-3 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{line.product.name}</span>
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{line.product.sku}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <input
                          className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          type="number"
                          min="0"
                          value={line.quantity}
                          onChange={event => handleQuantityChange(line.product.id, event.target.value)}
                        />
                      </td>
                      <td className="px-2 py-3 text-right font-medium">{formatCurrency(line.product.unitPriceCents)}</td>
                      <td className="px-2 py-3">
                        <input
                          className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.lineDiscount}
                          onChange={event => handleLineDiscountChange(line.product.id, event.target.value)}
                        />
                      </td>
                      <td className="px-2 py-3 text-right">{line.product.taxRate.toFixed(2)}</td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(totalCents)}</td>
                      <td className="rounded-r-xl px-2 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.product.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400/50 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <span>Customer Name (optional)</span>
            <input value={customerName} onChange={event => setCustomerName(event.target.value)} placeholder="Walk-in"/>
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <span>Payment Method</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={paymentMethod}
              onChange={event => setPaymentMethod(event.target.value as (typeof paymentOptions)[number])}
            >
              {paymentOptions.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <span>Order Discount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={orderDiscount}
              onChange={event => setOrderDiscount(event.target.value)}
            />
          </label>
        </div>

        <dl className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 sm:grid-cols-2">
          <div className="flex items-center justify-between">
            <dt>Subtotal</dt>
            <dd>{formatCurrency(totals.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Discount</dt>
            <dd>{formatCurrency(totals.orderDiscount)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Tax</dt>
            <dd>{formatCurrency(totals.tax)}</dd>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-base text-slate-900 shadow-inner dark:bg-slate-900 dark:text-white">
            <dt>Total Due</dt>
            <dd>{formatCurrency(totals.total)}</dd>
          </div>
        </dl>

        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
            {error}
          </p>
        )}

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-brand-primary to-brand-accent px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || cart.length === 0}
          onClick={handleSubmit}
        >
          {isSubmitting ? "Processing…" : "Charge & Print"}
        </button>
      </section>

      {invoice && <InvoiceDialog sale={invoice} onClose={closeInvoice}/>}
    </div>
  );
}

function describeError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to create sale. Please try again.";
}
