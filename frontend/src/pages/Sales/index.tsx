import {useEffect, useMemo, useState} from "react";
import {
  fetchSale,
  fetchSales,
  refundSale,
  voidSale,
  type Sale,
} from "@/features/pos/api";
import {InvoiceDialog} from "@/features/pos/components/InvoiceDialog";
import {useCurrencyFormatter} from "@/features/settings/ShopProfileContext";

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
  const {formatCurrency} = useCurrencyFormatter();
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
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <aside className="flex flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Filters</h2>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>From</span>
          <input
            type="date"
            value={filter.from.slice(0, 10)}
            onChange={event => handleFilterChange({from: new Date(event.target.value).toISOString()})}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>To</span>
          <input
            type="date"
            value={filter.to.slice(0, 10)}
            onChange={event => handleFilterChange({to: new Date(event.target.value).toISOString()})}
          />
        </label>

        <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <legend className="text-sm font-semibold text-slate-600 dark:text-slate-300">Payment Methods</legend>
          <div className="mt-3 flex flex-col gap-2">
            {PAYMENT_METHODS.map(method => (
              <label key={method} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
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
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <legend className="text-sm font-semibold text-slate-600 dark:text-slate-300">Status</legend>
          <div className="mt-3 flex flex-col gap-2">
            {STATUSES.map(status => (
              <label key={status} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
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
          </div>
        </fieldset>

        <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
          <p className="flex items-center justify-between">
            <span>Total Completed</span>
            <span>{summary.count}</span>
          </p>
          <p className="mt-2 flex items-center justify-between text-brand-primary dark:text-blue-200">
            <span>Revenue</span>
            <span>{formatCurrency(summary.totalCents)}</span>
          </p>
        </div>
      </aside>

      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Sales History</h2>
          {actionMessage && (
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200" role="status">
              {actionMessage}
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading sales…</p>
        ) : error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-separate border-spacing-y-2 text-left text-sm text-slate-700 dark:text-slate-200">
              <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2">Payment</th>
                  <th className="px-2 py-2 text-right">Total</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id} className="rounded-2xl bg-slate-50/70 shadow-sm dark:bg-slate-800/60">
                    <td className="rounded-l-2xl px-3 py-3 font-semibold text-slate-900 dark:text-white">{sale.saleNumber}</td>
                    <td className="px-2 py-3 text-sm">{new Date(sale.timestamp).toLocaleString()}</td>
                    <td className="px-2 py-3 text-sm">{sale.customerName || "Walk-in"}</td>
                    <td className="px-2 py-3 text-sm">{sale.paymentMethod}</td>
                    <td className="px-2 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(sale.totalCents)}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          sale.status === "Completed"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : sale.status === "Refunded"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="rounded-r-2xl px-2 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => showInvoice(sale.id)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          View
                        </button>
                        {sale.status === "Completed" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRefund(sale.id)}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                            >
                              Refund
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVoid(sale.id)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400/50 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
                            >
                              Void
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && <InvoiceDialog sale={selected} onClose={() => setSelected(null)}/>}
    </div>
  );
}
