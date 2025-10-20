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
    <div className="pos-pane">
      <section className="pos-search">
        <h2>Products</h2>
        <input
          className="pos-search__input"
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search by name or SKU"
        />

        <div className="pos-product-list">
          {filteredProducts.map(product => (
            <article key={product.id} className="pos-product">
              <div>
                <h3>{product.name}</h3>
                <p>SKU: {product.sku}</p>
              </div>
              <div className="pos-product__meta">
                <span>{formatCurrency(product.unitPriceCents)}</span>
                <button type="button" onClick={() => handleAddToCart(product)}>
                  Add
                </button>
              </div>
            </article>
          ))}
          {filteredProducts.length === 0 && <p className="pos-empty">No products match that search.</p>}
        </div>
      </section>

      <section className="pos-cart">
        <h2>Cart</h2>

        {cart.length === 0 ? (
          <p className="pos-empty">Scan or search items to begin building the invoice.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{width: "30%"}}>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Tax %</th>
                <th>Total</th>
                <th/>
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
                  <tr key={line.product.id}>
                    <td>
                      <div className="pos-cart__item">
                        <strong>{line.product.name}</strong>
                        <span>{line.product.sku}</span>
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={line.quantity}
                        onChange={event => handleQuantityChange(line.product.id, event.target.value)}
                      />
                    </td>
                    <td>{formatCurrency(line.product.unitPriceCents)}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.lineDiscount}
                        onChange={event => handleLineDiscountChange(line.product.id, event.target.value)}
                      />
                    </td>
                    <td>{line.product.taxRate.toFixed(2)}</td>
                    <td>{formatCurrency(totalCents)}</td>
                    <td>
                      <button type="button" onClick={() => handleRemoveLine(line.product.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="pos-form">
          <label>
            <span>Customer Name (optional)</span>
            <input value={customerName} onChange={event => setCustomerName(event.target.value)} placeholder="Walk-in"/>
          </label>

          <label>
            <span>Payment Method</span>
            <select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as typeof paymentOptions[number])}>
              {paymentOptions.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>

          <label>
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

        <dl className="pos-summary">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatCurrency(totals.subtotal)}</dd>
          </div>
          <div>
            <dt>Discount</dt>
            <dd>{formatCurrency(totals.orderDiscount)}</dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>{formatCurrency(totals.tax)}</dd>
          </div>
          <div className="pos-summary__total">
            <dt>Total Due</dt>
            <dd>{formatCurrency(totals.total)}</dd>
          </div>
        </dl>

        {error && <p className="pos-error">{error}</p>}

        <button
          type="button"
          className="pos-submit"
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
