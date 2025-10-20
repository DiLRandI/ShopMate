import {CreateSale} from "../../../wailsjs/go/sale/API";
import {sale} from "../../../wailsjs/go/models";

type CreateSaleRequestLine = {
  productId: number;
  quantity: number;
  discountCents: number;
};

export type CreateSaleRequest = {
  saleNumber: string;
  customerName: string;
  paymentMethod: "Cash" | "Card" | "Wallet/UPI";
  discountCents: number;
  lines: CreateSaleRequestLine[];
};

export type Sale = sale.Sale;

export async function createSale(request: CreateSaleRequest): Promise<Sale> {
  const payload = sale.CreateSaleRequest.createFrom(request);
  return CreateSale(payload);
}
