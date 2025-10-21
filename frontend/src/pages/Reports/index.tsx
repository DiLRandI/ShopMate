import {useEffect, useState} from "react";
import {
  exportDailySummaryCSV,
  exportTopProductsCSV,
  fetchDailySummary,
  fetchTopProducts,
  type DailySummaryView,
  type TopProduct,
} from "@/features/reports/api";

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

function currency(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {style: "currency", currency: "USD"});
}

export function ReportsPage() {
  const todayISO = new Date().toISOString();
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [rangeStart, setRangeStart] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  const [rangeEnd, setRangeEnd] = useState(todayISO);
  const [summary, setSummary] = useState<DailySummaryView | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void refreshSummary(selectedDate);
    void refreshTopProducts(rangeStart, rangeEnd);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshSummary(dateISO: string) {
    try {
      const data = await fetchDailySummary(dateISO);
      setSummary(data);
    } catch (error) {
      setStatus(`Unable to load summary: ${describeError(error)}`);
    }
  }

  async function refreshTopProducts(fromISO: string, toISO: string) {
    try {
      const data = await fetchTopProducts(fromISO, toISO, 5);
      setTopProducts(data);
    } catch (error) {
      setStatus(`Unable to load top products: ${describeError(error)}`);
    }
  }

  async function handleExportDaily() {
    if (!summary) return;
    try {
      const bytes = await exportDailySummaryCSV(selectedDate);
      download(bytes, `daily-summary-${selectedDate.slice(0, 10)}.csv`);
      setStatus("Daily summary exported.");
    } catch (error) {
      setStatus(`Export failed: ${describeError(error)}`);
    }
  }

  async function handleExportTop() {
    try {
      const bytes = await exportTopProductsCSV(rangeStart, rangeEnd, 5);
      download(bytes, `top-products-${rangeStart.slice(0, 10)}-${rangeEnd.slice(0, 10)}.csv`);
      setStatus("Top products exported.");
    } catch (error) {
      setStatus(`Export failed: ${describeError(error)}`);
    }
  }

  return (
    <div className="flex flex-col gap-6 xl:grid xl:grid-cols-2">
      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Daily Summary</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Quick glance at sales for the selected day.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={toDateInputValue(selectedDate)}
              onChange={event => {
                const iso = new Date(event.target.value).toISOString();
                setSelectedDate(iso);
                void refreshSummary(iso);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleExportDaily}
              className="rounded-full bg-gradient-to-r from-brand-primary to-brand-accent px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-primary/60"
            >
              Export CSV
            </button>
          </div>
        </header>
        {summary ? (
          <dl className="grid gap-4 rounded-2xl bg-slate-50/70 p-4 text-sm font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-200 sm:grid-cols-2">
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
              <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Sales</dt>
              <dd className="mt-1 text-lg text-brand-primary dark:text-blue-200">{currency(summary.totalSales)}</dd>
            </div>
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
              <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Invoices</dt>
              <dd className="mt-1 text-lg">{summary.invoiceCount}</dd>
            </div>
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
              <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Average Ticket</dt>
              <dd className="mt-1 text-lg">{currency(summary.averageTicket)}</dd>
            </div>
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
              <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Tax Collected</dt>
              <dd className="mt-1 text-lg">{currency(summary.taxCollected)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading summary…</p>
        )}
      </section>

      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Top Products</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Ranked by revenue within the selected range.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={toDateInputValue(rangeStart)}
              onChange={event => {
                const iso = new Date(event.target.value).toISOString();
                setRangeStart(iso);
                void refreshTopProducts(iso, rangeEnd);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <input
              type="date"
              value={toDateInputValue(rangeEnd)}
              onChange={event => {
                const iso = new Date(event.target.value).toISOString();
                setRangeEnd(iso);
                void refreshTopProducts(rangeStart, iso);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleExportTop}
              className="rounded-full bg-gradient-to-r from-brand-primary to-brand-accent px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-primary/60"
            >
              Export CSV
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-4">
          {topProducts.map(product => {
            const maxRevenue = topProducts[0]?.revenueCents ?? 1;
            const width = Math.max(8, (product.revenueCents / maxRevenue) * 100);
            return (
              <div key={product.productId} className="rounded-2xl border border-slate-200/60 bg-slate-50/60 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{product.productName || "Unnamed"}</p>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{product.quantitySold} sold</p>
                  </div>
                  <span className="text-sm font-semibold text-brand-primary dark:text-blue-200">{currency(product.revenueCents)}</span>
                </div>
                <div className="mt-3 h-3 w-full rounded-full bg-slate-200/80 dark:bg-slate-700/80">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-accent"
                    style={{width: `${width}%`}}
                  />
                </div>
              </div>
            );
          })}
          {topProducts.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No sales for this range.</p>}
        </div>
      </section>

      {status && (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300" role="status">
          {status}
        </p>
      )}
    </div>
  );
}

function download(bytes: Uint8Array, filename: string) {
  const blob = bytesToBlob(bytes, "text/csv;charset=utf-8");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  const view = new Uint8Array(bytes.length);
  view.set(bytes);
  return new Blob([view.buffer], {type});
}
