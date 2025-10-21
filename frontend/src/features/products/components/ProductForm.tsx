import type {ChangeEvent, FormEvent} from "react";
import {useState} from "react";
import type {ProductInput} from "../api";

type FormState = {
  name: string;
  category: string;
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
  category: "",
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
      category: form.category.trim(),
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
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>Name</span>
          <input required value={form.name} onChange={updateField("name")} placeholder="Milk 1L"/>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>Category</span>
          <input value={form.category} onChange={updateField("category")} placeholder="Dairy"/>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>SKU / Barcode</span>
          <input required value={form.sku} onChange={updateField("sku")} placeholder="SKU-001"/>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>Unit Price (USD)</span>
          <input required type="number" min="0" step="0.01" value={form.price} onChange={updateField("price")}/>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>Tax %</span>
          <input type="number" min="0" step="0.01" value={form.taxRate} onChange={updateField("taxRate")}/>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>Stock</span>
          <input type="number" min="0" step="1" value={form.stockQuantity} onChange={updateField("stockQuantity")}/>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>Reorder Level</span>
          <input type="number" min="0" step="1" value={form.reorderLevel} onChange={updateField("reorderLevel")}/>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <span>Notes</span>
        <textarea rows={2} value={form.notes} onChange={updateField("notes")} className="min-h-[72px] resize-y"/>
      </label>

      {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 dark:border-rose-700/80 dark:bg-rose-900/40 dark:text-rose-200">{error}</p>}

      <button
        type="submit"
        className="self-end rounded-lg bg-gradient-to-r from-brand-primary to-brand-accent px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/60 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Add Product"}
      </button>
    </form>
  );
}
