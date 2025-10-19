import {CreateProduct, ListProducts} from "../../../wailsjs/go/product/API";
import type {product} from "../../../wailsjs/go/models";

type ProductInput = product.ProductInput;
type ProductView = product.ProductView;

// Wails injects the runtime context when undefined is passed from the generated bridge.
const runtimeContext: unknown = undefined;

const listProducts = ListProducts as unknown as (ctx: unknown) => Promise<ProductView[]>;
const createProductBridge = CreateProduct as unknown as (ctx: unknown, input: ProductInput) => Promise<ProductView>;

export async function fetchProducts(): Promise<ProductView[]> {
  return listProducts(runtimeContext);
}

export async function createProduct(input: ProductInput): Promise<ProductView> {
  return createProductBridge(runtimeContext, input);
}

export type {ProductInput, ProductView};
