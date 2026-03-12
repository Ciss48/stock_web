/**
 * lib/db.ts — All database queries using Supabase directly.
 * Used by:  API routes (→ client components call these routes)
 *           Server Components (imported directly, no HTTP hop)
 */
import { getSupabase } from "./supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

const B = 1_000_000_000; // VND stored as raw units in DB → divide for billions

function toB(v: number | null): number | null {
  return v != null ? Math.round((v / B) * 100) / 100 : null;
}

function round(v: number | null, n = 2): number | null {
  if (v == null) return null;
  const f = Math.pow(10, n);
  return Math.round(v * f) / f;
}

function periodLabel(year: number, quarter: number) {
  return `Q${quarter}/${String(year).slice(-2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Market Overview ───────────────────────────────────────────────────────────

export async function getMarketOverview() {
  const [{ data: snapshots }, { data: companies }] = await Promise.all([
    getSupabase().from("market_daily_snapshot").select("*"),
    getSupabase().from("companies").select("ticker, name, exchange, sectors(name)"),
  ]);

  const snapMap: Record<string, any> = {};
  for (const s of snapshots ?? []) snapMap[s.ticker] = s;

  const data = (companies ?? [])
    .map((c: any) => {
      const snap = snapMap[c.ticker];
      if (!snap) return null;
      return {
        ticker: c.ticker,
        name: c.name,
        exchange: c.exchange,
        sector: c.sectors?.name ?? null,
        date: snap.date,
        open: snap.open,
        high: snap.high,
        low: snap.low,
        close: snap.close,
        volume: snap.volume,
        change: snap.change,
        change_pct: snap.change_pct,
      };
    })
    .filter(Boolean);

  data.sort((a: any, b: any) => b.change_pct - a.change_pct);
  return { data, total: data.length };
}

// ── Market Sectors ────────────────────────────────────────────────────────────

export async function getMarketSectors() {
  const { data: stocks } = await getMarketOverview();
  const sectors: Record<string, any> = {};

  for (const s of stocks) {
    const sec = s.sector || "Khác";
    if (!sectors[sec])
      sectors[sec] = { sector: sec, tickers: [], total: 0, up: 0, down: 0, flat: 0 };
    sectors[sec].tickers.push(s.ticker);
    sectors[sec].total += s.change_pct;
    if (s.change_pct > 0) sectors[sec].up++;
    else if (s.change_pct < 0) sectors[sec].down++;
    else sectors[sec].flat++;
  }

  const result = Object.values(sectors).map((d: any) => {
    const n = d.tickers.length;
    return { ...d, count: n, avg_change_pct: n ? round(d.total / n) : 0 };
  });
  result.sort((a: any, b: any) => b.avg_change_pct - a.avg_change_pct);
  return { data: result };
}

// ── Stock list ────────────────────────────────────────────────────────────────

export async function getStocks() {
  const { data } = await getSupabase()
    .from("companies")
    .select("ticker, name, exchange, sectors(name)")
    .order("ticker");

  return {
    data: (data ?? []).map((c: any) => ({
      ticker: c.ticker,
      name: c.name,
      exchange: c.exchange,
      sector: c.sectors?.name ?? null,
    })),
  };
}

// ── Stock detail ──────────────────────────────────────────────────────────────

export async function getStockDetail(ticker: string) {
  const t = ticker.toUpperCase();

  const [{ data: companies }, { data: snapshots }, { data: ratios }] = await Promise.all([
    getSupabase()
      .from("companies")
      .select("ticker, name, exchange, sectors(name)")
      .eq("ticker", t),
    getSupabase().from("market_daily_snapshot").select("*").eq("ticker", t),
    getSupabase()
      .from("financial_ratios")
      .select("year, quarter, pe, pb, roe, roa, eps")
      .eq("ticker", t)
      .order("year", { ascending: false })
      .order("quarter", { ascending: false })
      .limit(1),
  ]);

  const c = companies?.[0];
  if (!c) return null;

  const snap = snapshots?.[0] ?? {};
  const ratio = ratios?.[0] ?? {};

  return {
    ticker: t,
    name: c.name,
    exchange: c.exchange,
    sector: (c as any).sectors?.name ?? null,
    price: {
      date: snap.date,
      open: snap.open,
      high: snap.high,
      low: snap.low,
      close: snap.close,
      volume: snap.volume,
      change: snap.change ?? 0,
      change_pct: snap.change_pct ?? 0,
    },
    ratios: {
      pe: round(ratio.pe),
      pb: round(ratio.pb),
      roe: round(ratio.roe, 4),
      roa: round(ratio.roa, 4),
      eps: round(ratio.eps, 0),
      period:
        ratio.year ? periodLabel(ratio.year, ratio.quarter) : null,
    },
  };
}

// ── Price history ─────────────────────────────────────────────────────────────

export async function getPriceHistory(ticker: string, start?: string, end?: string) {
  const t = ticker.toUpperCase();
  const s = start ?? daysAgo(365);
  const e = end ?? today();

  const { data } = await getSupabase()
    .from("price_history")
    .select("date, open, high, low, close, volume")
    .eq("ticker", t)
    .gte("date", s)
    .lte("date", e)
    .order("date", { ascending: true })
    .range(0, 4999);

  const rows = data ?? [];
  const candles = rows.map((r: any) => ({
    time: r.date,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
  }));
  const volumes = rows.map((r: any) => ({
    time: r.date,
    value: r.volume,
    color: r.close >= r.open ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)",
  }));

  return { ticker: t, start: s, end: e, candles, volumes };
}

// ── Technical analysis data ───────────────────────────────────────────────────

export async function getTechnicalData(ticker: string, days = 90) {
  const t = ticker.toUpperCase();
  const start = daysAgo(days + 250); // extra lookback for indicator warm-up

  const [{ data: prices }, { data: indicators }] = await Promise.all([
    getSupabase()
      .from("price_history")
      .select("date, open, high, low, close, volume")
      .eq("ticker", t)
      .gte("date", start)
      .order("date", { ascending: true })
      .range(0, 4999),
    getSupabase()
      .from("technical_indicators")
      .select("date, sma20, sma50, sma200, ema20, bb_upper, bb_middle, bb_lower, rsi14, macd_line, macd_signal, macd_hist")
      .eq("ticker", t)
      .gte("date", start)
      .order("date", { ascending: true })
      .range(0, 4999),
  ]);

  const indicatorMap: Record<string, any> = {};
  for (const ind of indicators ?? []) indicatorMap[ind.date] = ind;

  // Merge price + indicator rows, then slice to requested range
  const cutoff = daysAgo(days);
  const bars = (prices ?? [])
    .filter((p: any) => p.date >= cutoff)
    .map((p: any) => ({ ...p, ...(indicatorMap[p.date] ?? {}) }));

  return { ticker: t, bars };
}

// ── Income statement ──────────────────────────────────────────────────────────

export async function getIncome(ticker: string, quarters = 12) {
  const t = ticker.toUpperCase();
  const { data } = await getSupabase()
    .from("income_statement")
    .select("year, quarter, revenue, gross_profit, operating_profit, net_profit")
    .eq("ticker", t)
    .order("year", { ascending: false })
    .order("quarter", { ascending: false })
    .limit(quarters);

  const rows = (data ?? [])
    .sort((a: any, b: any) => a.year !== b.year ? a.year - b.year : a.quarter - b.quarter)
    .slice(-quarters);

  const labels = rows.map((r: any) => periodLabel(r.year, r.quarter));
  return {
    ticker: t,
    labels,
    series: {
      revenue:          rows.map((r: any) => toB(r.revenue)),
      gross_profit:     rows.map((r: any) => toB(r.gross_profit)),
      operating_profit: rows.map((r: any) => toB(r.operating_profit)),
      net_profit:       rows.map((r: any) => toB(r.net_profit)),
    },
    unit: "tỷ VND",
  };
}

// ── Balance sheet ─────────────────────────────────────────────────────────────

export async function getBalance(ticker: string, quarters = 12) {
  const t = ticker.toUpperCase();
  const { data } = await getSupabase()
    .from("balance_sheet")
    .select("year, quarter, total_assets, total_liabilities, total_equity, cash")
    .eq("ticker", t)
    .order("year", { ascending: false })
    .order("quarter", { ascending: false })
    .limit(quarters);

  const rows = (data ?? [])
    .sort((a: any, b: any) => a.year !== b.year ? a.year - b.year : a.quarter - b.quarter)
    .slice(-quarters);

  const labels = rows.map((r: any) => periodLabel(r.year, r.quarter));
  return {
    ticker: t,
    labels,
    series: {
      total_assets:      rows.map((r: any) => toB(r.total_assets)),
      total_liabilities: rows.map((r: any) => toB(r.total_liabilities)),
      total_equity:      rows.map((r: any) => toB(r.total_equity)),
      cash:              rows.map((r: any) => toB(r.cash)),
    },
    unit: "tỷ VND",
  };
}

// ── Cash flow ─────────────────────────────────────────────────────────────────

export async function getCashflow(ticker: string, quarters = 12) {
  const t = ticker.toUpperCase();
  const { data } = await getSupabase()
    .from("cash_flow")
    .select("year, quarter, operating_cf, investing_cf, financing_cf")
    .eq("ticker", t)
    .order("year", { ascending: false })
    .order("quarter", { ascending: false })
    .limit(quarters);

  const rows = (data ?? [])
    .sort((a: any, b: any) => a.year !== b.year ? a.year - b.year : a.quarter - b.quarter)
    .slice(-quarters);

  const labels = rows.map((r: any) => periodLabel(r.year, r.quarter));
  return {
    ticker: t,
    labels,
    series: {
      operating_cf: rows.map((r: any) => toB(r.operating_cf)),
      investing_cf: rows.map((r: any) => toB(r.investing_cf)),
      financing_cf: rows.map((r: any) => toB(r.financing_cf)),
    },
    unit: "tỷ VND",
  };
}

// ── Financial ratios ──────────────────────────────────────────────────────────

export async function getRatios(ticker: string, quarters = 12) {
  const t = ticker.toUpperCase();
  const { data } = await getSupabase()
    .from("financial_ratios")
    .select("year, quarter, pe, pb, roe, roa, eps, debt_to_equity, current_ratio")
    .eq("ticker", t)
    .order("year", { ascending: false })
    .order("quarter", { ascending: false })
    .limit(quarters);

  const rows = (data ?? [])
    .sort((a: any, b: any) => a.year !== b.year ? a.year - b.year : a.quarter - b.quarter)
    .slice(-quarters);

  const labels = rows.map((r: any) => periodLabel(r.year, r.quarter));
  return {
    ticker: t,
    labels,
    series: {
      pe:             rows.map((r: any) => round(r.pe)),
      pb:             rows.map((r: any) => round(r.pb)),
      roe:            rows.map((r: any) => round(r.roe, 4)),
      roa:            rows.map((r: any) => round(r.roa, 4)),
      eps:            rows.map((r: any) => round(r.eps, 0)),
      debt_to_equity: rows.map((r: any) => round(r.debt_to_equity)),
      current_ratio:  rows.map((r: any) => round(r.current_ratio)),
    },
  };
}

// ── Compare prices (normalized base=100) ─────────────────────────────────────

export async function getComparePrices(tickers: string[], start: string, end?: string) {
  const e = end ?? today();

  const results = await Promise.all(
    tickers.map(async (t) => {
      const { data } = await getSupabase()
        .from("price_history")
        .select("date, close")
        .eq("ticker", t)
        .gte("date", start)
        .lte("date", e)
        .order("date", { ascending: true })
        .range(0, 4999);
      return { ticker: t, rows: data ?? [] };
    })
  );

  const series: Record<string, Record<string, number>> = {};
  const allDates = new Set<string>();

  for (const { ticker, rows } of results) {
    if (!rows.length) continue;
    const base = rows[0].close;
    if (!base) continue;
    series[ticker] = {};
    for (const r of rows) {
      series[ticker][r.date] = round(r.close / base * 100)!;
      allDates.add(r.date);
    }
  }

  const sortedDates = Array.from(allDates).sort();
  return {
    start,
    end: e,
    dates: sortedDates,
    series: Object.fromEntries(
      Object.keys(series).map((t) => [t, sortedDates.map((d) => series[t][d] ?? null)])
    ),
  };
}

// ── Compare ratios ────────────────────────────────────────────────────────────

export async function getCompareRatios(tickers: string[]) {
  const results = await Promise.all(
    tickers.map(async (t) => {
      const { data } = await getSupabase()
        .from("financial_ratios")
        .select("year, quarter, pe, pb, roe, roa, eps, debt_to_equity")
        .eq("ticker", t)
        .order("year", { ascending: false })
        .order("quarter", { ascending: false })
        .limit(1);
      return { ticker: t, data: data?.[0] ?? null };
    })
  );

  const metrics = ["pe", "pb", "roe", "roa", "eps", "debt_to_equity"];
  const comparison = metrics.map((metric) => {
    const row: any = { metric };
    for (const { ticker, data } of results) {
      row[ticker] = data ? round(data[metric]) : null;
    }
    return row;
  });

  return {
    tickers: results.map((r) => r.ticker),
    periods: Object.fromEntries(
      results.map(({ ticker, data }) => [
        ticker,
        data ? periodLabel(data.year, data.quarter) : null,
      ])
    ),
    comparison,
  };
}
