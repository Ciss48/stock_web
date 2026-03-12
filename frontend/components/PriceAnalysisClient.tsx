"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  LineChart, Line, ComposedChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// ── Ticker config ─────────────────────────────────────────────────────────────
const TICKERS = [
  { ticker: "VNM", name: "Vinamilk",           startPrice: 68000,  volBase: 2_000_000, seed: 42  },
  { ticker: "VCB", name: "Vietcombank",         startPrice: 95000,  volBase: 3_000_000, seed: 123 },
  { ticker: "FPT", name: "FPT Corp",            startPrice: 130000, volBase: 2_500_000, seed: 77  },
  { ticker: "HPG", name: "Hòa Phát Group",      startPrice: 27000,  volBase: 5_000_000, seed: 99  },
  { ticker: "MWG", name: "Thế Giới Di Động",    startPrice: 65000,  volBase: 1_500_000, seed: 55  },
];

const RANGES = [
  { label: "1T", days: 30  },
  { label: "3T", days: 90  },
  { label: "6T", days: 180 },
  { label: "1N", days: 365 },
];

// ── Mock data generation ──────────────────────────────────────────────────────
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0xffffffff; };
}

type Bar = { date: string; open: number; high: number; low: number; close: number; volume: number };

function generateOHLCV(cfg: typeof TICKERS[0]): Bar[] {
  const rand = lcg(cfg.seed);
  const dates: string[] = [];
  const d = new Date("2025-06-01");
  const end = new Date("2026-03-11");
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  let close = cfg.startPrice;
  return dates.map(date => {
    const chg  = (rand() - 0.49) * 0.030;
    const open = close;
    close = Math.round(open * (1 + chg));
    const wick = rand() * 0.012;
    const high = Math.round(Math.max(open, close) * (1 + wick));
    const low  = Math.round(Math.min(open, close) * (1 - wick));
    const volume = Math.round((rand() * 0.8 + 0.3) * cfg.volBase);
    return { date, open, high, low, close, volume };
  });
}

const DATA_CACHE: Record<string, Bar[]> = {};
function getTickerData(ticker: string): Bar[] {
  if (!DATA_CACHE[ticker]) {
    const cfg = TICKERS.find(t => t.ticker === ticker)!;
    DATA_CACHE[ticker] = generateOHLCV(cfg);
  }
  return DATA_CACHE[ticker];
}

// ── Technical indicators ──────────────────────────────────────────────────────
function sma(data: number[], n: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < n - 1) return null;
    return data.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n;
  });
}

function ema(data: number[], n: number): (number | null)[] {
  const k = 2 / (n + 1);
  const result: (number | null)[] = [];
  let val: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { result.push(null); continue; }
    if (i === n - 1) { val = data.slice(0, n).reduce((a, b) => a + b, 0) / n; result.push(val); continue; }
    val = data[i] * k + val! * (1 - k);
    result.push(val);
  }
  return result;
}

function bollingerBands(data: number[], n = 20, mult = 2) {
  const mid = sma(data, n);
  return data.map((_, i) => {
    if (mid[i] === null) return { upper: null as number | null, mid: null as number | null, lower: null as number | null };
    const m = mid[i]!;
    const std = Math.sqrt(data.slice(i - n + 1, i + 1).reduce((acc, v) => acc + (v - m) ** 2, 0) / n);
    return { upper: m + mult * std, mid: m, lower: m - mult * std };
  });
}

function rsi(data: number[], n = 14): (number | null)[] {
  return data.map((_, i) => {
    if (i < n) return null;
    let gains = 0, losses = 0;
    for (let j = i - n + 1; j <= i; j++) {
      const diff = data[j] - data[j - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const rs = losses === 0 ? 9999 : gains / losses;
    return 100 - 100 / (1 + rs);
  });
}

function macdIndicator(data: number[], fast = 12, slow = 26, sig = 9) {
  const ef = ema(data, fast);
  const es = ema(data, slow);
  const macdLine: (number | null)[] = data.map((_, i) =>
    ef[i] !== null && es[i] !== null ? ef[i]! - es[i]! : null
  );
  const nonNullIdx: number[] = [];
  const nonNullVals: number[] = [];
  macdLine.forEach((v, i) => { if (v !== null) { nonNullIdx.push(i); nonNullVals.push(v); } });
  const sigEMA = ema(nonNullVals, sig);
  const signalLine: (number | null)[] = Array(data.length).fill(null);
  nonNullIdx.forEach((idx, j) => { signalLine[idx] = sigEMA[j]; });
  const histogram: (number | null)[] = macdLine.map((v, i) =>
    v !== null && signalLine[i] !== null ? v - signalLine[i]! : null
  );
  return { macdLine, signalLine, histogram };
}

// ── Signal types ──────────────────────────────────────────────────────────────
type Signal = "MUA" | "TRUNG TÍNH" | "BÁN";
const sigColor = (s: Signal) =>
  s === "MUA" ? "text-emerald-400" : s === "BÁN" ? "text-red-400" : "text-slate-400";
const sigBadge = (s: Signal) =>
  s === "MUA"
    ? "text-emerald-400 border-emerald-800 bg-emerald-950/40"
    : s === "BÁN"
    ? "text-red-400 border-red-800 bg-red-950/40"
    : "text-slate-400 border-slate-700 bg-slate-800/40";

// ── Component ─────────────────────────────────────────────────────────────────
export default function PriceAnalysisClient() {
  const [ticker,   setTicker]   = useState("VNM");
  const [rangeDays, setRange]   = useState(90);
  const [overlays, setOverlays] = useState({ ma20: true, ma50: true, bb: false });
  const chartContainer = useRef<HTMLDivElement>(null);

  // Data sliced to selected range
  const allData = useMemo(() => getTickerData(ticker), [ticker]);
  const ohlcv = useMemo(() => {
    const cutoff = new Date("2026-03-11");
    cutoff.setDate(cutoff.getDate() - rangeDays);
    const cutStr = cutoff.toISOString().slice(0, 10);
    return allData.filter(d => d.date >= cutStr);
  }, [allData, rangeDays]);

  const closes = useMemo(() => ohlcv.map(d => d.close), [ohlcv]);

  // Indicators
  const ma20Raw  = useMemo(() => sma(closes, 20),          [closes]);
  const ma50Raw  = useMemo(() => sma(closes, 50),          [closes]);
  const bbRaw    = useMemo(() => bollingerBands(closes),   [closes]);
  const rsiRaw   = useMemo(() => rsi(closes),              [closes]);
  const macdRaw  = useMemo(() => macdIndicator(closes),    [closes]);

  // lightweight-charts formatted series (nulls removed)
  type LCPoint = { time: string; value: number };
  const ma20Pts = useMemo<LCPoint[]>(() =>
    ohlcv.map((d, i) => ma20Raw[i] !== null ? { time: d.date, value: ma20Raw[i]! } : null)
      .filter((v): v is LCPoint => v !== null),
    [ohlcv, ma20Raw]
  );
  const ma50Pts = useMemo<LCPoint[]>(() =>
    ohlcv.map((d, i) => ma50Raw[i] !== null ? { time: d.date, value: ma50Raw[i]! } : null)
      .filter((v): v is LCPoint => v !== null),
    [ohlcv, ma50Raw]
  );
  const bbPts = useMemo(() => ({
    upper: ohlcv.map((d, i) => bbRaw[i].upper !== null ? { time: d.date, value: bbRaw[i].upper! } : null).filter((v): v is LCPoint => v !== null),
    mid:   ohlcv.map((d, i) => bbRaw[i].mid   !== null ? { time: d.date, value: bbRaw[i].mid!   } : null).filter((v): v is LCPoint => v !== null),
    lower: ohlcv.map((d, i) => bbRaw[i].lower !== null ? { time: d.date, value: bbRaw[i].lower! } : null).filter((v): v is LCPoint => v !== null),
  }), [ohlcv, bbRaw]);

  // Recharts data
  const rsiChart = useMemo(() =>
    ohlcv.map((d, i) => ({ date: d.date.slice(5), rsi: rsiRaw[i] !== null ? +rsiRaw[i]!.toFixed(2) : null })),
    [ohlcv, rsiRaw]
  );
  const macdChart = useMemo(() =>
    ohlcv.map((d, i) => ({
      date:      d.date.slice(5),
      macd:      macdRaw.macdLine[i]   !== null ? +macdRaw.macdLine[i]!.toFixed(0)   : null,
      signal:    macdRaw.signalLine[i] !== null ? +macdRaw.signalLine[i]!.toFixed(0) : null,
      histogram: macdRaw.histogram[i]  !== null ? +macdRaw.histogram[i]!.toFixed(0)  : null,
    })),
    [ohlcv, macdRaw]
  );

  // Signal summary
  const signals = useMemo(() => {
    const last   = ohlcv.length - 1;
    if (last < 0) return [];
    const close  = ohlcv[last].close;
    const lMA20  = ma20Pts.at(-1)?.value;
    const lMA50  = ma50Pts.at(-1)?.value;
    const lBBU   = bbPts.upper.at(-1)?.value;
    const lBBL   = bbPts.lower.at(-1)?.value;
    const lRSI   = rsiRaw[last];
    const lHist  = macdRaw.histogram[last];
    return [
      { name: "MA20",    value: lMA20  ? close.toLocaleString("vi-VN") : "—",
        signal: (lMA20 ? (close > lMA20 ? "MUA" : "BÁN") : "TRUNG TÍNH") as Signal },
      { name: "MA50",    value: lMA50  ? close.toLocaleString("vi-VN") : "—",
        signal: (lMA50 ? (close > lMA50 ? "MUA" : "BÁN") : "TRUNG TÍNH") as Signal },
      { name: "BB(20,2)", value: lBBU && lBBL ? `${Math.round(lBBL).toLocaleString("vi-VN")} – ${Math.round(lBBU).toLocaleString("vi-VN")}` : "—",
        signal: (lBBU && lBBL ? (close > lBBU ? "BÁN" : close < lBBL ? "MUA" : "TRUNG TÍNH") : "TRUNG TÍNH") as Signal },
      { name: "RSI(14)", value: lRSI !== null ? lRSI.toFixed(1) : "—",
        signal: (lRSI !== null ? (lRSI > 70 ? "BÁN" : lRSI < 30 ? "MUA" : "TRUNG TÍNH") : "TRUNG TÍNH") as Signal },
      { name: "MACD",    value: lHist !== null ? (lHist > 0 ? "Dương" : "Âm") : "—",
        signal: (lHist !== null ? (lHist > 0 ? "MUA" : "BÁN") : "TRUNG TÍNH") as Signal },
    ];
  }, [ohlcv, ma20Pts, ma50Pts, bbPts, rsiRaw, macdRaw]);

  const overall = useMemo<Signal>(() => {
    const buy  = signals.filter(s => s.signal === "MUA").length;
    const sell = signals.filter(s => s.signal === "BÁN").length;
    if (buy  > sell && buy  >= 3) return "MUA";
    if (sell > buy  && sell >= 3) return "BÁN";
    return "TRUNG TÍNH";
  }, [signals]);

  // ── lightweight-charts effect ─────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainer.current || !ohlcv.length) return;
    let cleanup: (() => void) | undefined;

    import("lightweight-charts").then((lc) => {
      if (!chartContainer.current) return;

      const chart = lc.createChart(chartContainer.current, {
        width:  chartContainer.current.clientWidth,
        height: 380,
        layout: { background: { color: "#0f172a" }, textColor: "#64748b" },
        grid:   { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
        crosshair: { mode: lc.CrosshairMode.Normal },
        rightPriceScale: { borderColor: "#1e293b" },
        timeScale: { borderColor: "#1e293b", timeVisible: true, secondsVisible: false },
      });

      // Candles
      const candleSeries = chart.addSeries(lc.CandlestickSeries, {
        upColor: "#22c55e", downColor: "#ef4444",
        borderUpColor: "#22c55e", borderDownColor: "#ef4444",
        wickUpColor: "#22c55e", wickDownColor: "#ef4444",
      });
      candleSeries.setData(
        ohlcv.map(d => ({ time: d.date as any, open: d.open, high: d.high, low: d.low, close: d.close }))
      );

      // Volume
      const volSeries = chart.addSeries(lc.HistogramSeries, {
        priceScaleId: "vol",
        priceFormat: { type: "volume" as const },
      });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      volSeries.setData(
        ohlcv.map(d => ({
          time: d.date as any,
          value: d.volume,
          color: d.close >= d.open ? "#22c55e44" : "#ef444444",
        }))
      );

      // MA20
      if (overlays.ma20 && ma20Pts.length) {
        const s = chart.addSeries(lc.LineSeries, { color: "#f59e0b", lineWidth: 1 as any, crosshairMarkerVisible: false });
        s.setData(ma20Pts as any);
      }
      // MA50
      if (overlays.ma50 && ma50Pts.length) {
        const s = chart.addSeries(lc.LineSeries, { color: "#a78bfa", lineWidth: 1 as any, crosshairMarkerVisible: false });
        s.setData(ma50Pts as any);
      }
      // Bollinger Bands
      if (overlays.bb) {
        const opts = { lineWidth: 1 as any, crosshairMarkerVisible: false };
        if (bbPts.upper.length) {
          const s = chart.addSeries(lc.LineSeries, { ...opts, color: "#3b82f666" });
          s.setData(bbPts.upper as any);
        }
        if (bbPts.mid.length) {
          const s = chart.addSeries(lc.LineSeries, { ...opts, color: "#3b82f6" });
          s.setData(bbPts.mid as any);
        }
        if (bbPts.lower.length) {
          const s = chart.addSeries(lc.LineSeries, { ...opts, color: "#3b82f666" });
          s.setData(bbPts.lower as any);
        }
      }

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (chartContainer.current) chart.applyOptions({ width: chartContainer.current.clientWidth });
      });
      ro.observe(chartContainer.current);
      cleanup = () => { ro.disconnect(); chart.remove(); };
    });

    return () => { cleanup?.(); };
  }, [ohlcv, overlays, ma20Pts, ma50Pts, bbPts]);

  // ── Render ────────────────────────────────────────────────────────────────
  const tickerInfo = TICKERS.find(t => t.ticker === ticker)!;
  const lastBar    = ohlcv.at(-1);
  const prevBar    = ohlcv.at(-2);
  const change     = lastBar && prevBar ? lastBar.close - prevBar.close : 0;
  const changePct  = prevBar ? change / prevBar.close * 100 : 0;

  return (
    <div className="flex gap-4">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div className="w-52 shrink-0 space-y-3">

        {/* Ticker list */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Mã cổ phiếu</p>
          {TICKERS.map(t => (
            <button
              key={t.ticker}
              onClick={() => setTicker(t.ticker)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 last:mb-0 ${
                ticker === t.ticker
                  ? "bg-emerald-900/40 text-emerald-400 border border-emerald-800"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent"
              }`}
            >
              <div className="font-bold">{t.ticker}</div>
              <div className="text-xs opacity-60 truncate">{t.name}</div>
            </button>
          ))}
        </div>

        {/* Time range */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Khoảng thời gian</p>
          <div className="grid grid-cols-2 gap-1">
            {RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => setRange(r.days)}
                className={`py-1.5 rounded text-xs font-medium transition-colors ${
                  rangeDays === r.days
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overlays */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Đường phụ</p>
          {([
            { key: "ma20" as const, label: "MA20",           color: "#f59e0b" },
            { key: "ma50" as const, label: "MA50",           color: "#a78bfa" },
            { key: "bb"   as const, label: "Bollinger Bands",color: "#3b82f6" },
          ]).map(o => (
            <label key={o.key} className="flex items-center gap-2 py-1.5 cursor-pointer select-none">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0 transition-colors border"
                style={{
                  background: overlays[o.key] ? o.color : "transparent",
                  borderColor: overlays[o.key] ? o.color : "#475569",
                }}
              />
              <input
                type="checkbox"
                className="sr-only"
                checked={overlays[o.key]}
                onChange={() => setOverlays(prev => ({ ...prev, [o.key]: !prev[o.key] }))}
              />
              <span className="text-xs text-slate-300">{o.label}</span>
            </label>
          ))}
        </div>

        {/* Legend */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 space-y-1.5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Chú giải</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Tăng
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-3 h-3 rounded-sm bg-red-500" /> Giảm
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-4 h-0.5 bg-amber-400 inline-block" /> MA20
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-4 h-0.5 bg-violet-400 inline-block" /> MA50
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-4 h-0.5 bg-blue-400 inline-block" /> BB(20,2)
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{ticker}</h1>
            <p className="text-slate-400 text-sm">{tickerInfo.name}</p>
          </div>
          {lastBar && (
            <>
              <span className="text-3xl font-bold font-mono text-white">
                {lastBar.close.toLocaleString("vi-VN")}
              </span>
              <span className={`text-base font-semibold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {change >= 0 ? "+" : ""}{change.toLocaleString("vi-VN")}
                {" "}({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
              </span>
              <div className="ml-auto text-right text-sm text-slate-400">
                <div>Vol: {lastBar.volume.toLocaleString("vi-VN")}</div>
                <div className="text-xs text-slate-500">{lastBar.date}</div>
              </div>
            </>
          )}
        </div>

        {/* Candlestick + volume */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div
            ref={chartContainer}
            className="w-full rounded-lg overflow-hidden"
            style={{ height: 380 }}
          />
        </div>

        {/* RSI panel */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">RSI (14)</h3>
            {rsiRaw[ohlcv.length - 1] !== null && (
              <span className={`text-sm font-bold font-mono ${
                rsiRaw[ohlcv.length - 1]! > 70 ? "text-red-400"
                : rsiRaw[ohlcv.length - 1]! < 30 ? "text-emerald-400"
                : "text-slate-300"
              }`}>
                {rsiRaw[ohlcv.length - 1]!.toFixed(1)}
                <span className="text-xs font-normal text-slate-500 ml-1">
                  {rsiRaw[ohlcv.length - 1]! > 70 ? "Quá mua" : rsiRaw[ohlcv.length - 1]! < 30 ? "Quá bán" : "Trung tính"}
                </span>
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={rsiChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} tickCount={6} />
              <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 9 }} width={28} ticks={[30, 50, 70]} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 11 }}
                formatter={(v: any) => [typeof v === "number" ? v.toFixed(1) : v, "RSI"]}
              />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.7} label={{ value: "70", fill: "#ef4444", fontSize: 9 }} />
              <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 2" strokeOpacity={0.7} label={{ value: "30", fill: "#22c55e", fontSize: 9 }} />
              <ReferenceLine y={50} stroke="#475569" strokeDasharray="2 2" strokeOpacity={0.5} />
              <Line type="monotone" dataKey="rsi" stroke="#06b6d4" dot={false} strokeWidth={1.5} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* MACD panel */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">MACD (12, 26, 9)</h3>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-400 inline-block" /> MACD</span>
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-amber-400 inline-block" /> Signal</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500/50 inline-block" /> Histogram</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={macdChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} tickCount={6} />
              <YAxis tick={{ fill: "#64748b", fontSize: 9 }} width={40} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 11 }}
              />
              <ReferenceLine y={0} stroke="#475569" strokeOpacity={0.7} />
              <Bar dataKey="histogram" maxBarSize={5}>
                {macdChart.map((entry, i) => (
                  <Cell key={i} fill={(entry.histogram ?? 0) >= 0 ? "#22c55e88" : "#ef444488"} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="macd"   stroke="#3b82f6" dot={false} strokeWidth={1.5} connectNulls />
              <Line type="monotone" dataKey="signal" stroke="#f59e0b" dot={false} strokeWidth={1.5} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Signal summary table */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Tổng hợp tín hiệu kỹ thuật</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${sigBadge(overall)}`}>
              {overall}
            </span>
          </div>
          <div className="flex">
            {/* Gauge */}
            <div className="w-40 shrink-0 flex flex-col items-center justify-center py-6 border-r border-slate-800">
              <div className={`text-4xl font-black mb-1 ${sigColor(overall)}`}>
                {signals.filter(s => s.signal === "MUA").length}
              </div>
              <div className="text-xs text-slate-500">MUA</div>
              <div className="my-2 w-16 h-px bg-slate-700" />
              <div className="text-2xl font-black text-slate-400 mb-1">
                {signals.filter(s => s.signal === "TRUNG TÍNH").length}
              </div>
              <div className="text-xs text-slate-500">TRUNG TÍNH</div>
              <div className="my-2 w-16 h-px bg-slate-700" />
              <div className={`text-4xl font-black mb-1 ${signals.filter(s => s.signal === "BÁN").length > 0 ? "text-red-400" : "text-slate-600"}`}>
                {signals.filter(s => s.signal === "BÁN").length}
              </div>
              <div className="text-xs text-slate-500">BÁN</div>
            </div>
            {/* Table */}
            <table className="flex-1 text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-2 text-left text-xs text-slate-500 font-medium">Chỉ báo</th>
                  <th className="px-4 py-2 text-right text-xs text-slate-500 font-medium">Giá trị</th>
                  <th className="px-4 py-2 text-right text-xs text-slate-500 font-medium">Tín hiệu</th>
                </tr>
              </thead>
              <tbody>
                {signals.map(s => (
                  <tr key={s.name} className="market-row">
                    <td className="px-4 py-2.5 text-slate-300 font-medium">{s.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-400 text-xs">{s.value}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${sigColor(s.signal)}`}>{s.signal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
