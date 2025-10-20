import {
  AdjustStock,
  CreateProduct,
  DeleteProduct,
  ExportProductsCSV,
  ImportProductsCSV,
  ListProducts,
  LowStockCount,
  UpdateProduct,
} from "../../../wailsjs/go/product/API";
import {product} from "../../../wailsjs/go/models";
import {unwrap, unwrapVoid} from "@/services/wailsResponse";

export type ProductInput = product.ProductInput;
export type ProductView = product.ProductView;
export type ImportResult = product.ImportResponse;

export async function fetchProducts(): Promise<ProductView[]> {
  const envelope = await ListProducts();
  return unwrap(envelope).map(product.ProductView.createFrom);
}

export async function createProduct(input: ProductInput): Promise<ProductView> {
  const envelope = await CreateProduct(product.ProductInput.createFrom(input));
  return product.ProductView.createFrom(unwrap(envelope));
}

export async function updateProduct(id: number, form: ProductInput): Promise<ProductView> {
  const envelope = await UpdateProduct(product.UpdateProductRequest.createFrom({id, form}));
  return product.ProductView.createFrom(unwrap(envelope));
}

export async function deleteProduct(id: number): Promise<void> {
  const envelope = await DeleteProduct(id);
  unwrapVoid(envelope);
}

export async function adjustStock(request: product.AdjustStockRequest): Promise<ProductView> {
  const envelope = await AdjustStock(product.AdjustStockRequest.createFrom(request));
  return product.ProductView.createFrom(unwrap(envelope));
}

export async function importProductsFromCSV(csv: string): Promise<ImportResult> {
  const envelope = await ImportProductsCSV(product.ImportRequest.createFrom({csv}));
  return product.ImportResponse.createFrom(unwrap(envelope));
}

export async function exportProductsCSV(): Promise<Uint8Array> {
  const envelope = await ExportProductsCSV();
  const base64 = unwrap(envelope);
  const binary = globalThis.atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export async function fetchLowStockCount(): Promise<number> {
  const envelope = await LowStockCount();
  return unwrap(envelope);
}
