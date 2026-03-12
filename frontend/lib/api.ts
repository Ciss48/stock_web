/**
 * lib/api.ts — Client-side fetch helpers.
 * Calls Next.js API routes (which in turn call Supabase server-side).
 * Used only in Client Components ("use client").
 */

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface StockOverview {
  ticker: string; name: string; sector: string; exchange: string;
  date: string; open: number; high: number; low: number;
  close: number; volume: number; change: number; change_pct: number;
}

export interface SectorSummary {
  sector: string; count: number; avg_change_pct: number; up: number; down: number; tickers: string[];
}

export interface StockInfo {
  ticker: string; name: string; sector: string; exchange: string;
  price: { close: number; change: number; change_pct: number; open: number; high: number; low: number; volume: number; date: string };
  ratios: { pe: number | null; pb: number | null; roe: number | null; roa: number | null; eps: number | null; period: string | null };
}

export interface PriceHistory {
  ticker: string; start: string; end: string;
  candles: { time: string; open: number; high: number; low: number; close: number }[];
  volumes: { time: string; value: number; color: string }[];
}

export interface FinancialSeries {
  ticker: string; labels: string[]; series: Record<string, (number | null)[]>; unit?: string;
}

export interface ComparePrice {
  start: string; end: string; dates: string[]; series: Record<string, (number | null)[]>;
}

export interface CompareRatios {
  tickers: string[]; periods: Record<string, string | null>;
  comparison: ({ metric: string } & Record<string, number | null>)[];
}

// ── API calls ────────────────────────────────────────────────────────────────

export const api = {
  marketOverview: () => get<{ data: StockOverview[]; total: number }>("/api/market/overview"),
  marketSectors:  () => get<{ data: SectorSummary[] }>("/api/market/sectors"),
  stocks:         () => get<{ data: { ticker: string; name: string; sector: string; exchange: string }[] }>("/api/stocks"),
  stock:          (ticker: string) => get<StockInfo>(`/api/stocks/${ticker}`),
  prices:         (ticker: string, start?: string, end?: string) =>
    get<PriceHistory>(`/api/stocks/${ticker}/prices${start ? `?start=${start}${end ? `&end=${end}` : ""}` : ""}`),
  income:         (ticker: string, q = 12) => get<FinancialSeries>(`/api/stocks/${ticker}/income?quarters=${q}`),
  balance:        (ticker: string, q = 12) => get<FinancialSeries>(`/api/stocks/${ticker}/balance?quarters=${q}`),
  cashflow:       (ticker: string, q = 12) => get<FinancialSeries>(`/api/stocks/${ticker}/cashflow?quarters=${q}`),
  ratios:         (ticker: string, q = 12) => get<FinancialSeries>(`/api/stocks/${ticker}/ratios?quarters=${q}`),
  comparePrices:  (tickers: string[], start?: string) =>
    get<ComparePrice>(`/api/compare/prices?tickers=${tickers.join(",")}${start ? `&start=${start}` : ""}`),
  compareRatios:  (tickers: string[]) => get<CompareRatios>(`/api/compare/ratios?tickers=${tickers.join(",")}`),
};
