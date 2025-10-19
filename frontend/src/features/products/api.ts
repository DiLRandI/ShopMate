import {CreateProduct, ListProducts} from "../../../wailsjs/go/product/API";
import type {product} from "../../../wailsjs/go/models";

type ProductInput = product.ProductInput;
type ProductView = product.ProductView;

export async function fetchProducts(): Promise<ProductView[]> {
  return ListProducts();
}

export async function createProduct(input: ProductInput): Promise<ProductView> {
  return CreateProduct(input);
}

export type {ProductInput, ProductView};
