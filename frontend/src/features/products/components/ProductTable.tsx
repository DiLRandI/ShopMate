import {useCurrencyFormatter} from "@/features/settings/ShopProfileContext";
import type {ProductView} from "../api";

type ProductTableProps = {
  products: ProductView[];
  onAdjustStock?: (productId: number, delta: number) => void;
};

export function ProductTable({products, onAdjustStock}: ProductTableProps) {
  const {formatCurrency} = useCurrencyFormatter();
  if (products.length === 0) {
    return <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">No products yet. Add your first item to populate inventory.</p>;
  }

  return (
    <table className="min-w-full table-fixed border-separate border-spacing-0 text-left text-sm text-slate-700 dark:text-slate-200">
      <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <tr>
          <th className="py-3 pl-4 pr-2 sm:pl-6">Name</th>
          <th className="px-2 py-3">SKU</th>
          <th className="px-2 py-3 text-right">Price</th>
          <th className="px-2 py-3 text-center">Stock</th>
          <th className="px-2 py-3 text-center">Reorder</th>
          <th className="px-2 py-3 text-right">Tax %</th>
          {onAdjustStock ? <th className="py-3 pl-2 pr-4 text-right sm:pr-6">Adjust</th> : null}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
        {products.map(product => {
          const lowStock = product.reorderLevel > 0 && product.stockQuantity <= product.reorderLevel;
          return (
            <tr key={product.id} className={lowStock ? "bg-amber-50/70 dark:bg-amber-900/30" : "bg-white dark:bg-slate-900/40"}>
              <td className="py-3 pl-4 pr-2 font-semibold text-slate-900 dark:text-white sm:pl-6">{product.name}</td>
              <td className="px-2 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{product.sku}</td>
              <td className="px-2 py-3 text-right font-medium">{formatCurrency(product.unitPriceCents)}</td>
              <td className="px-2 py-3 text-center">{product.stockQuantity}</td>
              <td className="px-2 py-3 text-center">{product.reorderLevel}</td>
              <td className="px-2 py-3 text-right">{product.taxRate.toFixed(2)}</td>
              {onAdjustStock ? (
                <td className="py-3 pl-2 pr-4">
                  <div className="flex justify-end gap-2 sm:pr-2">
                    <button
                      type="button"
                      onClick={() => onAdjustStock(product.id, 1)}
                      className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustStock(product.id, -1)}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400/50 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
                    >
                      -1
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
