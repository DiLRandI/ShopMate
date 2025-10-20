import {CreateSale, GetSale, ListSales, RefundSale, VoidSale} from "../../../wailsjs/go/sale/API";
import {sale} from "../../../wailsjs/go/models";
import {unwrap, unwrapVoid} from "@/services/wailsResponse";

type CreateSaleRequestLine = sale.CreateSaleRequestLine;

export type CreateSaleRequest = sale.CreateSaleRequest;
export type Sale = sale.Sale;
export type SaleFilter = sale.ListSalesRequest;

export async function createSale(request: CreateSaleRequest): Promise<Sale> {
  const envelope = await CreateSale(sale.CreateSaleRequest.createFrom(request));
  return sale.Sale.createFrom(unwrap(envelope));
}

export async function fetchSale(id: number): Promise<Sale> {
  const envelope = await GetSale(id);
  return sale.Sale.createFrom(unwrap(envelope));
}

export async function fetchSales(filter: Partial<SaleFilter>): Promise<Sale[]> {
  const payload = sale.ListSalesRequest.createFrom(filter);
  const envelope = await ListSales(payload);
  return unwrap(envelope).map(sale.Sale.createFrom);
}

export async function refundSale(id: number): Promise<void> {
  const envelope = await RefundSale(id);
  unwrapVoid(envelope);
}

export async function voidSale(id: number, note: string): Promise<void> {
  const envelope = await VoidSale(id, note);
  unwrapVoid(envelope);
}

export function buildCreateSaleRequest(input: {
  saleNumber: string;
  customerName?: string;
  paymentMethod: string;
  discountCents: number;
  note?: string;
  lines: Array<Omit<CreateSaleRequestLine, "__ignore" | "createFrom" | "constructor">>;
}): CreateSaleRequest {
  const requestLines = input.lines.map(line => sale.CreateSaleRequestLine.createFrom(line));
  return sale.CreateSaleRequest.createFrom({
    ...input,
    lines: requestLines,
  });
}
