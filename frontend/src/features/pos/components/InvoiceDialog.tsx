import {useEffect} from "react";
import type {Sale} from "@/features/pos/api";
import {formatCurrency} from "@/features/pos/utils";

type InvoiceDialogProps = {
  sale: Sale;
  onClose: () => void;
};

export function InvoiceDialog({sale, onClose}: InvoiceDialogProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.print();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [sale]);

  return (
    <div className="invoice-overlay" role="dialog" aria-modal="true">
      <div className="invoice-card">
        <header className="invoice-card__header">
          <h2>Invoice {sale.saleNumber}</h2>
          <p>Payment Method: {sale.paymentMethod}</p>
        </header>

        <div className="invoice-card__body">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Tax</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map(line => (
                <tr key={`${line.productId}-${line.sku}`}>
                  <td>
                    <strong>{line.productName}</strong>
                    <div className="invoice-card__sku">{line.sku}</div>
                  </td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(line.unitPriceCents)}</td>
                  <td>{formatCurrency(line.discountCents)}</td>
                  <td>{formatCurrency(line.taxCents)}</td>
                  <td>{formatCurrency(line.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="invoice-card__footer">
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(sale.subtotalCents)}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>{formatCurrency(sale.discountCents)}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>{formatCurrency(sale.taxCents)}</dd>
            </div>
            <div className="invoice-card__total">
              <dt>Total</dt>
              <dd>{formatCurrency(sale.totalCents)}</dd>
            </div>
          </dl>

          <div className="invoice-card__actions">
            <button type="button" onClick={() => window.print()}>
              Print Again
            </button>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
