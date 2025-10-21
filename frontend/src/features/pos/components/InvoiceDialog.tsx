import {useEffect} from "react";
import type {Sale} from "@/features/pos/api";
import {useCurrencyFormatter} from "@/features/settings/ShopProfileContext";

type InvoiceDialogProps = {
  sale: Sale;
  onClose: () => void;
};

export function InvoiceDialog({sale, onClose}: InvoiceDialogProps) {
  const {formatCurrency} = useCurrencyFormatter();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.print();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [sale]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-4 py-10 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-6 overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-6 shadow-2xl transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Invoice {sale.saleNumber}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Payment Method: {sale.paymentMethod}</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-primary dark:bg-blue-900/30 dark:text-blue-100">
            {new Date(sale.timestamp ?? Date.now()).toLocaleString()}
          </span>
        </header>

        <div className="flex-1 overflow-auto rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <table className="min-w-full table-fixed border-separate border-spacing-y-2 text-left text-sm text-slate-700 dark:text-slate-200">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3">Item</th>
                <th className="px-2 text-right">Qty</th>
                <th className="px-2 text-right">Price</th>
                <th className="px-2 text-right">Discount</th>
                <th className="px-2 text-right">Tax</th>
                <th className="px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map(line => {
                const discountCents = (line as unknown as {lineDiscountCents?: number; discountCents?: number}).lineDiscountCents ??
                  (line as unknown as {lineDiscountCents?: number; discountCents?: number}).discountCents ?? 0;
                const taxCents = (line as unknown as {lineTaxCents?: number; taxCents?: number}).lineTaxCents ??
                  (line as unknown as {lineTaxCents?: number; taxCents?: number}).taxCents ?? 0;
                return (
                  <tr key={`${line.productId}-${line.sku}`} className="rounded-xl bg-white shadow-sm dark:bg-slate-800/80">
                    <td className="rounded-l-xl px-3 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{line.productName}</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{line.sku}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right">{line.quantity}</td>
                    <td className="px-2 py-3 text-right">{formatCurrency(line.unitPriceCents)}</td>
                    <td className="px-2 py-3 text-right">{formatCurrency(discountCents)}</td>
                    <td className="px-2 py-3 text-right">{formatCurrency(taxCents)}</td>
                    <td className="rounded-r-xl px-2 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(line.lineTotalCents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <dl className="grid grid-cols-2 gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <dt>Subtotal</dt>
              <dd>{formatCurrency(sale.subtotalCents)}</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <dt>Discount</dt>
              <dd>{formatCurrency(sale.discountCents)}</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <dt>Tax</dt>
              <dd>{formatCurrency(sale.taxCents)}</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent px-3 py-2 text-white shadow-lg">
              <dt>Total</dt>
              <dd>{formatCurrency(sale.totalCents)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Print Again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-gradient-to-r from-brand-primary to-brand-accent px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/60"
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
