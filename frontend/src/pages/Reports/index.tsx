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
    <div className="reports-pane">
      <section className="reports-summary">
        <header>
          <h2>Daily Summary</h2>
          <div className="reports-summary__controls">
            <input
              type="date"
              value={toDateInputValue(selectedDate)}
              onChange={event => {
                const iso = new Date(event.target.value).toISOString();
                setSelectedDate(iso);
                void refreshSummary(iso);
              }}
            />
            <button type="button" onClick={handleExportDaily}>Export CSV</button>
          </div>
        </header>
        {summary ? (
          <dl>
            <div>
              <dt>Total Sales</dt>
              <dd>{currency(summary.totalSales)}</dd>
            </div>
            <div>
              <dt>Invoices</dt>
              <dd>{summary.invoiceCount}</dd>
            </div>
            <div>
              <dt>Average Ticket</dt>
              <dd>{currency(summary.averageTicket)}</dd>
            </div>
            <div>
              <dt>Tax Collected</dt>
              <dd>{currency(summary.taxCollected)}</dd>
            </div>
          </dl>
        ) : (
          <p>Loading summary…</p>
        )}
      </section>

      <section className="reports-top">
        <header>
          <h2>Top Products</h2>
          <div className="reports-top__controls">
            <input
              type="date"
              value={toDateInputValue(rangeStart)}
              onChange={event => {
                const iso = new Date(event.target.value).toISOString();
                setRangeStart(iso);
                void refreshTopProducts(iso, rangeEnd);
              }}
            />
            <input
              type="date"
              value={toDateInputValue(rangeEnd)}
              onChange={event => {
                const iso = new Date(event.target.value).toISOString();
                setRangeEnd(iso);
                void refreshTopProducts(rangeStart, iso);
              }}
            />
            <button type="button" onClick={handleExportTop}>Export CSV</button>
          </div>
        </header>
        <div className="reports-bars">
          {topProducts.map(product => {
            const maxRevenue = topProducts[0]?.revenueCents ?? 1;
            const width = Math.max(8, (product.revenueCents / maxRevenue) * 100);
            return (
              <div key={product.productId} className="reports-bar">
                <div className="reports-bar__label">
                  <strong>{product.productName || "Unnamed"}</strong>
                  <span>{product.quantitySold} sold</span>
                </div>
                <div className="reports-bar__meter">
                  <span style={{width: `${width}%`}}/>
                  <em>{currency(product.revenueCents)}</em>
                </div>
              </div>
            );
          })}
          {topProducts.length === 0 && <p>No sales for this range.</p>}
        </div>
      </section>

      {status && <p className="reports-status" role="status">{status}</p>}
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
