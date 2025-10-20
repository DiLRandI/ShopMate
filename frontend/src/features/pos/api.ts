import {CreateSale} from "../../../wailsjs/go/sale/API";
import type {sale} from "../../../wailsjs/go/models";

export type CreateSaleRequest = sale.CreateSaleRequest;
export type Sale = sale.Sale;

export async function createSale(request: CreateSaleRequest): Promise<Sale> {
  return CreateSale(request);
}
