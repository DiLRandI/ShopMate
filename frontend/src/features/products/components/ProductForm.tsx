import {ChangeEvent, FormEvent, useState} from "react";
import type {ProductInput} from "../api";

type FormState = {
  name: string;
  sku: string;
  price: string;
  taxRate: string;
  stockQuantity: string;
  reorderLevel: string;
  notes: string;
};

type ProductFormProps = {
  onCreate: (input: ProductInput) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
};

const initialState: FormState = {
  name: "",
  sku: "",
  price: "0.00",
  taxRate: "0",
  stockQuantity: "0",
  reorderLevel: "0",
  notes: "",
};

function parseMoney(value: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100);
}

export function ProductForm({onCreate, isSubmitting, error}: ProductFormProps) {
  const [form, setForm] = useState<FormState>(initialState);

  const updateField = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({...prev, [field]: event.target.value}));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: ProductInput = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      unitPriceCents: parseMoney(form.price),
      taxRate: Number.parseFloat(form.taxRate) || 0,
      stockQuantity: Number.parseInt(form.stockQuantity, 10) || 0,
      reorderLevel: Number.parseInt(form.reorderLevel, 10) || 0,
      notes: form.notes.trim(),
    };

    await onCreate(payload);
    setForm(initialState);
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <div className="product-form__fields">
        <label>
          <span>Name</span>
          <input required value={form.name} onChange={updateField("name")} placeholder="Milk 1L"/>
        </label>
        <label>
          <span>SKU / Barcode</span>
          <input required value={form.sku} onChange={updateField("sku")} placeholder="SKU-001"/>
        </label>
        <label>
          <span>Unit Price (USD)</span>
          <input required type="number" min="0" step="0.01" value={form.price} onChange={updateField("price")}/>
        </label>
        <label>
          <span>Tax %</span>
          <input type="number" min="0" step="0.01" value={form.taxRate} onChange={updateField("taxRate")}/>
        </label>
        <label>
          <span>Stock</span>
          <input type="number" min="0" step="1" value={form.stockQuantity} onChange={updateField("stockQuantity")}/>
        </label>
        <label>
          <span>Reorder Level</span>
          <input type="number" min="0" step="1" value={form.reorderLevel} onChange={updateField("reorderLevel")}/>
        </label>
      </div>
      <label className="product-form__notes">
        <span>Notes</span>
        <textarea rows={2} value={form.notes} onChange={updateField("notes")}/>
      </label>

      {error && <p className="product-form__error">{error}</p>}

      <button type="submit" className="product-form__submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Add Product"}
      </button>
    </form>
  );
}
