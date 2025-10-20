import {
  DailySummary,
  DailySummaryCSV,
  TopProducts,
  TopProductsCSV,
} from "../../../wailsjs/go/report/API";
import {report} from "../../../wailsjs/go/models";
import {unwrap} from "@/services/wailsResponse";

export type DailySummaryView = report.DailySummary;
export type TopProduct = report.TopProduct;

export async function fetchDailySummary(dateISO: string): Promise<DailySummaryView> {
  const envelope = await DailySummary(dateISO);
  return report.DailySummary.createFrom(unwrap(envelope));
}

export async function fetchTopProducts(fromISO: string, toISO: string, limit: number): Promise<TopProduct[]> {
  const envelope = await TopProducts(fromISO, toISO, limit);
  return unwrap(envelope).map(report.TopProduct.createFrom);
}

export async function exportDailySummaryCSV(dateISO: string): Promise<Uint8Array> {
  const envelope = await DailySummaryCSV(dateISO);
  return base64ToBytes(unwrap(envelope));
}

export async function exportTopProductsCSV(fromISO: string, toISO: string, limit: number): Promise<Uint8Array> {
  const envelope = await TopProductsCSV(fromISO, toISO, limit);
  return base64ToBytes(unwrap(envelope));
}

function base64ToBytes(input: string): Uint8Array {
  const binary = globalThis.atob(input);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}
