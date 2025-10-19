import type {ProductInput, ProductView} from "../../../wailsjs/go/product/API";
import {CreateProduct, ListProducts} from "../../../wailsjs/go/product/API";

export async function fetchProducts(): Promise<ProductView[]> {
  return ListProducts();
}

export async function createProduct(input: ProductInput): Promise<ProductView> {
  return CreateProduct(input);
}

export type {ProductInput, ProductView};
