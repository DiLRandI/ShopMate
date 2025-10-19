import {useEffect, useState} from "react";
import {createProduct, fetchProducts, ProductView} from "@/features/products/api";
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

export function DashboardPage() {
  const [products, setProducts] = useState<ProductView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts()
      .then(items => {
        setProducts(items);
        setLoadError(null);
      })
      .catch(err => setLoadError(describeError(err)))
      .finally(() => setIsLoading(false));
  }, []);

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
    } catch (error) {
      setSubmitError(describeError(error));
      throw error;
    } finally {
      setIsSubmitting(false);
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
        <h2>New Product</h2>
        <ProductForm onCreate={handleCreate} isSubmitting={isSubmitting} error={submitError}/>
      </section>
      <section>
        <h2>Inventory</h2>
        <ProductTable products={products}/>
      </section>
    </div>
  );
}
