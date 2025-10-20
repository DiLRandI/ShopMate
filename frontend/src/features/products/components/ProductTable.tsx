import type {ProductView} from "../api";

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

type ProductTableProps = {
  products: ProductView[];
  onAdjustStock?: (productId: number, delta: number) => void;
};

export function ProductTable({products, onAdjustStock}: ProductTableProps) {
  if (products.length === 0) {
    return <p className="product-table__empty">No products yet. Add your first item to populate inventory.</p>;
  }

  return (
    <table className="product-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>SKU</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Reorder</th>
          <th>Tax %</th>
          {onAdjustStock ? <th>Adjust</th> : null}
        </tr>
      </thead>
      <tbody>
        {products.map(product => {
          const lowStock = product.reorderLevel > 0 && product.stockQuantity <= product.reorderLevel;
          return (
            <tr key={product.id} className={lowStock ? "product-row--low" : undefined}>
              <td>{product.name}</td>
              <td>{product.sku}</td>
              <td>{formatCurrency(product.unitPriceCents)}</td>
              <td>{product.stockQuantity}</td>
              <td>{product.reorderLevel}</td>
              <td>{product.taxRate.toFixed(2)}</td>
              {onAdjustStock ? (
                <td className="product-table__adjust">
                  <button type="button" onClick={() => onAdjustStock(product.id, 1)}>+1</button>
                  <button type="button" onClick={() => onAdjustStock(product.id, -1)}>-1</button>
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
