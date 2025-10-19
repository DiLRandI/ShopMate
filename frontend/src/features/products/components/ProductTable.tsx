import type {ProductView} from "../api";

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD"
  });
}

export function ProductTable({products}: {products: ProductView[]}) {
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
        </tr>
      </thead>
      <tbody>
        {products.map(product => (
          <tr key={product.id}>
            <td>{product.name}</td>
            <td>{product.sku}</td>
            <td>{formatCurrency(product.unitPriceCents)}</td>
            <td>{product.stockQuantity}</td>
            <td>{product.reorderLevel}</td>
            <td>{product.taxRate.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
