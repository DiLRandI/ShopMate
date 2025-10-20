import {useEffect, useRef, useState} from "react";
import {
  adjustStock,
  createProduct,
  exportProductsCSV,
  fetchLowStockCount,
  fetchProducts,
  importProductsFromCSV,
  type ImportResult,
  type ProductView,
} from "@/features/products/api";
import {ProductForm} from "@/features/products/components/ProductForm";
import {ProductTable} from "@/features/products/components/ProductTable";

function describeError(error: unknown): string {
  if (typeof error === "string") {
    if (error === "DUPLICATE_SKU") {
      return "That SKU already exists. Please choose a unique identifier.";
    }
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to complete the request.";
}

type DashboardPageProps = {
  onInventoryChanged?: (lowStock: number) => void;
};

export function DashboardPage({onInventoryChanged}: DashboardPageProps) {
  const [products, setProducts] = useState<ProductView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    refreshInventory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshInventory() {
    setIsLoading(true);
    try {
      const items = await fetchProducts();
      setProducts(items);
      setLoadError(null);
      if (onInventoryChanged) {
        const lowStock = await fetchLowStockCount();
        onInventoryChanged(lowStock);
      }
    } catch (error) {
      setLoadError(describeError(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(input: Parameters<typeof createProduct>[0]) {
    setIsSubmitting(true);
    try {
      const product = await createProduct(input);
      setProducts(prev => {
        const next = [...prev, product];
        next.sort((a, b) => a.name.localeCompare(b.name));
        return next;
      });
      setSubmitError(null);
      if (onInventoryChanged) {
        const lowStock = await fetchLowStockCount();
        onInventoryChanged(lowStock);
      }
    } catch (error) {
      setSubmitError(describeError(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExport() {
    try {
      const buffer = await exportProductsCSV();
      const blob = bytesToBlob(buffer, "text/csv;charset=utf-8");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `shopmate-products-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setImportFeedback("Exported inventory CSV.");
    } catch (error) {
      setImportFeedback(`Export failed: ${describeError(error)}`);
    }
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const result: ImportResult = await importProductsFromCSV(text);
      const issues = result.errors.length > 0 ? ` Issues: ${result.errors.join(", ")}` : "";
      setImportFeedback(`Imported ${result.created} new and ${result.updated} updated products.${issues}`);
      await refreshInventory();
    } catch (error) {
      setImportFeedback(`Import failed: ${describeError(error)}`);
    }
  }

  function triggerImport() {
    fileInputRef.current?.click();
  }

  async function handleStockAdjustment(productId: number, delta: number) {
    try {
      const updated = await adjustStock({productId, delta, reason: delta >= 0 ? "ManualAdjust" : "ManualAdjust", ref: ""});
      setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      if (onInventoryChanged) {
        const lowStock = await fetchLowStockCount();
        onInventoryChanged(lowStock);
      }
    } catch (error) {
      setImportFeedback(`Unable to adjust stock: ${describeError(error)}`);
    }
  }

  if (isLoading) {
    return <p>Loading inventory…</p>;
  }

  if (loadError) {
    return <p className="product-form__error">{loadError}</p>;
  }

  return (
    <div className="inventory-pane">
      <section>
        <div className="inventory-pane__header">
          <h2>New Product</h2>
          <div className="inventory-actions">
            <button type="button" onClick={handleExport}>Export CSV</button>
            <button type="button" onClick={triggerImport}>Import CSV</button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{display: "none"}}
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImport(file);
                }
                event.target.value = "";
              }}
            />
          </div>
        </div>
        <ProductForm onCreate={handleCreate} isSubmitting={isSubmitting} error={submitError}/>
        {importFeedback && <p className="inventory-feedback" role="status">{importFeedback}</p>}
      </section>
      <section>
        <h2>Inventory</h2>
        <ProductTable products={products} onAdjustStock={handleStockAdjustment}/>
      </section>
    </div>
  );
}

function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  const view = new Uint8Array(bytes.length);
  view.set(bytes);
  return new Blob([view.buffer], {type});
}
