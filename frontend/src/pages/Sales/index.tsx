import {useEffect, useMemo, useState} from "react";
import {
  fetchSale,
  fetchSales,
  refundSale,
  voidSale,
  type Sale,
} from "@/features/pos/api";
import {InvoiceDialog} from "@/features/pos/components/InvoiceDialog";

const PAYMENT_METHODS = ["Cash", "Card", "Wallet/UPI"] as const;
const STATUSES = ["Completed", "Refunded", "Voided"] as const;

type SalesFilter = {
  from: string;
  to: string;
  paymentMethods: string[];
  statuses: string[];
  customerQuery: string;
  limit: number;
  offset: number;
};

const defaultFilter = (): SalesFilter => {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    paymentMethods: [],
    statuses: ["Completed"],
    customerQuery: "",
    limit: 200,
    offset: 0,
  };
};

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function SalesPage() {
  const [filter, setFilter] = useState<SalesFilter>(defaultFilter);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    void refresh(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const completed = sales.filter(sale => sale.status === "Completed");
    const total = completed.reduce((sum, sale) => sum + sale.totalCents, 0);
    return {
      totalCents: total,
      count: completed.length,
    };
  }, [sales]);

  async function refresh(nextFilter: SalesFilter) {
    setIsLoading(true);
    try {
      const records = await fetchSales({
        from: nextFilter.from,
        to: nextFilter.to,
        paymentMethods: nextFilter.paymentMethods,
        statuses: nextFilter.statuses,
        customerQuery: "",
        limit: 200,
        offset: 0,
      });
      setSales(records);
      setError(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterChange(partial: Partial<SalesFilter>) {
    setFilter(prev => {
      const merged = {...prev, ...partial};
      void refresh(merged);
      return merged;
    });
  }

  async function handleRefund(id: number) {
    try {
      await refundSale(id);
      setActionMessage("Sale refunded and inventory restored.");
      await refresh(filter);
    } catch (err) {
      setActionMessage(`Refund failed: ${describeError(err)}`);
    }
  }

  async function handleVoid(id: number) {
    try {
      await voidSale(id, "Voided from history");
      setActionMessage("Sale voided.");
      await refresh(filter);
    } catch (err) {
      setActionMessage(`Void failed: ${describeError(err)}`);
    }
  }

  async function showInvoice(id: number) {
    try {
      const sale = await fetchSale(id);
      setSelected(sale);
    } catch (err) {
      setActionMessage(`Unable to load invoice: ${describeError(err)}`);
    }
  }

  return (
    <div className="sales-pane">
      <aside className="sales-filter">
        <h2>Filters</h2>
        <label>
          <span>From</span>
          <input
            type="date"
            value={filter.from.slice(0, 10)}
            onChange={event => handleFilterChange({from: new Date(event.target.value).toISOString()})}
          />
        </label>
        <label>
          <span>To</span>
          <input
            type="date"
            value={filter.to.slice(0, 10)}
            onChange={event => handleFilterChange({to: new Date(event.target.value).toISOString()})}
          />
        </label>

        <fieldset>
          <legend>Payment Methods</legend>
          {PAYMENT_METHODS.map(method => (
            <label key={method}>
              <input
                type="checkbox"
                checked={filter.paymentMethods.includes(method)}
                onChange={event => {
                  const next = event.target.checked
                    ? [...filter.paymentMethods, method]
                    : filter.paymentMethods.filter(value => value !== method);
                  handleFilterChange({paymentMethods: next});
                }}
              />
              {method}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Status</legend>
          {STATUSES.map(status => (
            <label key={status}>
              <input
                type="checkbox"
                checked={filter.statuses.includes(status)}
                onChange={event => {
                  const next = event.target.checked
                    ? [...filter.statuses, status]
                    : filter.statuses.filter(value => value !== status);
                  handleFilterChange({statuses: next});
                }}
              />
              {status}
            </label>
          ))}
        </fieldset>

        <div className="sales-summary">
          <p>Total Completed: {summary.count}</p>
          <p>Revenue: {(summary.totalCents / 100).toLocaleString(undefined, {style: "currency", currency: "USD"})}</p>
        </div>
      </aside>

      <section className="sales-history">
        <div className="sales-history__header">
          <h2>Sales History</h2>
          {actionMessage && <span className="sales-message" role="status">{actionMessage}</span>}
        </div>
        {isLoading ? (
          <p>Loading sales…</p>
        ) : error ? (
          <p className="sales-error">{error}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id}>
                  <td>{sale.saleNumber}</td>
                  <td>{new Date(sale.timestamp).toLocaleString()}</td>
                  <td>{sale.customerName || "Walk-in"}</td>
                  <td>{sale.paymentMethod}</td>
                  <td>{(sale.totalCents / 100).toLocaleString(undefined, {style: "currency", currency: "USD"})}</td>
                  <td>{sale.status}</td>
                  <td className="sales-actions">
                    <button type="button" onClick={() => showInvoice(sale.id)}>View</button>
                    {sale.status === "Completed" ? (
                      <>
                        <button type="button" onClick={() => handleRefund(sale.id)}>Refund</button>
                        <button type="button" onClick={() => handleVoid(sale.id)}>Void</button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selected && <InvoiceDialog sale={selected} onClose={() => setSelected(null)}/>}
    </div>
  );
}
