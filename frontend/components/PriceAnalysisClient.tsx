"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  LineChart, Line, ComposedChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from "recharts";

const RANGES = [
  { label: "1T", days: 30  },
  { label: "3T", days: 90  },
  { label: "6T", days: 180 },
  { label: "1N", days: 365 },
];

type BarData = {
  date: string; open: number; high: number; low: number; close: number; volume: number;
  sma20?: number | null; sma50?: number | null; sma200?: number | null; ema20?: number | null;
  bb_upper?: number | null; bb_middle?: number | null; bb_lower?: number | null;
  rsi14?: number | null; macd_line?: number | null; macd_signal?: number | null; macd_hist?: number | null;
};

type Signal = "MUA" | "TRUNG TÍNH" | "BÁN";

const sigColor  = (s: Signal) => s === "MUA" ? "text-emerald-400" : s === "BÁN" ? "text-red-400" : "text-slate-400";
const sigBadge  = (s: Signal) =>
  s === "MUA"  ? "text-emerald-400 border-emerald-800 bg-emerald-950/40" :
  s === "BÁN"  ? "text-red-400 border-red-800 bg-red-950/40" :
                 "text-slate-400 border-slate-700 bg-slate-800/40";

type LCPoint = { time: string; value: number };

export default function PriceAnalysisClient({ allStocks }: {
  allStocks: { ticker: string; name: string }[];
}) {
  const [ticker,    setTicker]    = useState(allStocks[0]?.ticker ?? "VCB");
  const [rangeDays, setRange]     = useState(90);
  const [overlays,  setOverlays]  = useState({ ma20: true, ma50: true, bb: false });
  const [bars,      setBars]      = useState<BarData[]>([]);
  const [loading,   setLoading]   = useState(false);
  const chartContainer            = useRef<HTMLDivElement>(null);

  // Fetch real data when ticker or range changes
  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    fetch(`/api/stocks/${ticker}/technical?days=${rangeDays}`)
      .then(r => r.json())
      .then(d => setBars(d.bars ?? []))
      .catch(() => setBars([]))
      .finally(() => setLoading(false));
  }, [ticker, rangeDays]);

  // Precompute LC series for overlays (filter out nulls)
  const ma20Pts = useMemo<LCPoint[]>(() =>
    bars.filter(b => b.sma20 != null).map(b => ({ time: b.date, value: b.sma20! })),
    [bars]);
  const ma50Pts = useMemo<LCPoint[]>(() =>
    bars.filter(b => b.sma50 != null).map(b => ({ time: b.date, value: b.sma50! })),
    [bars]);
  const bbPts = useMemo(() => ({
    upper: bars.filter(b => b.bb_upper != null).map(b => ({ time: b.date, value: b.bb_upper! })),
    mid:   bars.filter(b => b.bb_middle != null).map(b => ({ time: b.date, value: b.bb_middle! })),
    lower: bars.filter(b => b.bb_lower != null).map(b => ({ time: b.date, value: b.bb_lower! })),
  }), [bars]);

  // Recharts data
  const rsiChart  = useMemo(() => bars.map(b => ({
    date: b.date.slice(5),
    rsi: b.rsi14 != null ? +b.rsi14.toFixed(2) : null,
  })), [bars]);

  const macdChart = useMemo(() => bars.map(b => ({
    date:      b.date.slice(5),
    macd:      b.macd_line   != null ? +b.macd_line.toFixed(0)   : null,
    signal:    b.macd_signal != null ? +b.macd_signal.toFixed(0) : null,
    histogram: b.macd_hist   != null ? +b.macd_hist.toFixed(0)   : null,
  })), [bars]);

  // Signal summary from last bar
  const signals = useMemo<{ name: string; value: string; signal: Signal }[]>(() => {
    const last = bars.at(-1);
    if (!last) return [];
    const close = last.close;
    return [
      { name: "MA20",     value: last.sma20   ? close.toLocaleString("vi-VN") : "—",
        signal: last.sma20   ? (close > last.sma20   ? "MUA" : "BÁN") : "TRUNG TÍNH" },
      { name: "MA50",     value: last.sma50   ? close.toLocaleString("vi-VN") : "—",
        signal: last.sma50   ? (close > last.sma50   ? "MUA" : "BÁN") : "TRUNG TÍNH" },
      { name: "BB(20,2)", value: last.bb_upper && last.bb_lower
          ? `${Math.round(last.bb_lower).toLocaleString("vi-VN")} – ${Math.round(last.bb_upper).toLocaleString("vi-VN")}` : "—",
        signal: last.bb_upper && last.bb_lower
          ? (close > last.bb_upper ? "BÁN" : close < last.bb_lower ? "MUA" : "TRUNG TÍNH") : "TRUNG TÍNH" },
      { name: "RSI(14)",  value: last.rsi14 != null ? last.rsi14.toFixed(1) : "—",
        signal: last.rsi14 != null ? (last.rsi14 > 70 ? "BÁN" : last.rsi14 < 30 ? "MUA" : "TRUNG TÍNH") : "TRUNG TÍNH" },
      { name: "MACD",     value: last.macd_hist != null ? (last.macd_hist > 0 ? "Dương" : "Âm") : "—",
        signal: last.macd_hist != null ? (last.macd_hist > 0 ? "MUA" : "BÁN") : "TRUNG TÍNH" },
    ];
  }, [bars]);

  const overall = useMemo<Signal>(() => {
    const buy  = signals.filter(s => s.signal === "MUA").length;
    const sell = signals.filter(s => s.signal === "BÁN").length;
    if (buy  >= 3 && buy  > sell) return "MUA";
    if (sell >= 3 && sell > buy)  return "BÁN";
    return "TRUNG TÍNH";
  }, [signals]);

  // ── lightweight-charts effect ─────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainer.current || !bars.length) return;
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

      const candleSeries = chart.addSeries(lc.CandlestickSeries, {
        upColor: "#22c55e", downColor: "#ef4444",
        borderUpColor: "#22c55e", borderDownColor: "#ef4444",
        wickUpColor: "#22c55e", wickDownColor: "#ef4444",
      });
      candleSeries.setData(bars.map(b => ({ time: b.date as any, open: b.open, high: b.high, low: b.low, close: b.close })));

      const volSeries = chart.addSeries(lc.HistogramSeries, {
        priceScaleId: "vol", priceFormat: { type: "volume" as const },
      });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      volSeries.setData(bars.map(b => ({
        time: b.date as any, value: b.volume,
        color: b.close >= b.open ? "#22c55e44" : "#ef444444",
      })));

      if (overlays.ma20 && ma20Pts.length) {
        const s = chart.addSeries(lc.LineSeries, { color: "#f59e0b", lineWidth: 1 as any, crosshairMarkerVisible: false });
        s.setData(ma20Pts as any);
      }
      if (overlays.ma50 && ma50Pts.length) {
        const s = chart.addSeries(lc.LineSeries, { color: "#a78bfa", lineWidth: 1 as any, crosshairMarkerVisible: false });
        s.setData(ma50Pts as any);
      }
      if (overlays.bb) {
        const opts = { lineWidth: 1 as any, crosshairMarkerVisible: false };
        if (bbPts.upper.length) { const s = chart.addSeries(lc.LineSeries, { ...opts, color: "#3b82f666" }); s.setData(bbPts.upper as any); }
        if (bbPts.mid.length)   { const s = chart.addSeries(lc.LineSeries, { ...opts, color: "#3b82f6"   }); s.setData(bbPts.mid   as any); }
        if (bbPts.lower.length) { const s = chart.addSeries(lc.LineSeries, { ...opts, color: "#3b82f666" }); s.setData(bbPts.lower as any); }
      }

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (chartContainer.current) chart.applyOptions({ width: chartContainer.current.clientWidth });
      });
      ro.observe(chartContainer.current);
      cleanup = () => { ro.disconnect(); chart.remove(); };
    });

    return () => { cleanup?.(); };
  }, [bars, overlays, ma20Pts, ma50Pts, bbPts]);

  // ── Render ────────────────────────────────────────────────────────────────
  const tickerInfo = allStocks.find(t => t.ticker === ticker);
  const lastBar    = bars.at(-1);
  const prevBar    = bars.at(-2);
  const change     = lastBar && prevBar ? lastBar.close - prevBar.close : 0;
  const changePct  = prevBar ? change / prevBar.close * 100 : 0;

  return (
    <div className="flex gap-4">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div className="w-52 shrink-0 space-y-3">

        {/* Ticker list */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Mã cổ phiếu</p>
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {allStocks.map(t => (
              <button
                key={t.ticker}
                onClick={() => setTicker(t.ticker)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
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
                  rangeDays === r.days ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
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
            { key: "ma20" as const, label: "MA20",            color: "#f59e0b" },
            { key: "ma50" as const, label: "MA50",            color: "#a78bfa" },
            { key: "bb"   as const, label: "Bollinger Bands", color: "#3b82f6" },
          ]).map(o => (
            <label key={o.key} className="flex items-center gap-2 py-1.5 cursor-pointer select-none">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0 border transition-colors"
                style={{ background: overlays[o.key] ? o.color : "transparent", borderColor: overlays[o.key] ? o.color : "#475569" }}
              />
              <input type="checkbox" className="sr-only" checked={overlays[o.key]}
                onChange={() => setOverlays(prev => ({ ...prev, [o.key]: !prev[o.key] }))} />
              <span className="text-xs text-slate-300">{o.label}</span>
            </label>
          ))}
        </div>

        {/* Legend */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 space-y-1.5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Chú giải</p>
          <div className="flex items-center gap-2 text-xs text-slate-400"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> Tăng</div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><span className="w-3 h-3 rounded-sm bg-red-500" /> Giảm</div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><span className="w-4 h-0.5 bg-amber-400 inline-block" /> MA20</div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><span className="w-4 h-0.5 bg-violet-400 inline-block" /> MA50</div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><span className="w-4 h-0.5 bg-blue-400 inline-block" /> BB(20,2)</div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{ticker}</h1>
            <p className="text-slate-400 text-sm">{tickerInfo?.name}</p>
          </div>
          {lastBar && (
            <>
              <span className="text-3xl font-bold font-mono text-white">{lastBar.close.toLocaleString("vi-VN")}</span>
              <span className={`text-base font-semibold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {change >= 0 ? "+" : ""}{change.toLocaleString("vi-VN")} ({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
              </span>
              <div className="ml-auto text-right text-sm text-slate-400">
                <div>Vol: {lastBar.volume.toLocaleString("vi-VN")}</div>
                <div className="text-xs text-slate-500">{lastBar.date}</div>
              </div>
            </>
          )}
          {loading && <span className="text-xs text-slate-500 animate-pulse">Đang tải...</span>}
        </div>

        {/* Candlestick + volume */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          {loading && !bars.length
            ? <div className="flex items-center justify-center" style={{ height: 380 }}><span className="text-slate-500">Đang tải dữ liệu...</span></div>
            : <div ref={chartContainer} className="w-full rounded-lg overflow-hidden" style={{ height: 380 }} />
          }
        </div>

        {/* RSI panel */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">RSI (14)</h3>
            {bars.at(-1)?.rsi14 != null && (
              <span className={`text-sm font-bold font-mono ${
                bars.at(-1)!.rsi14! > 70 ? "text-red-400" : bars.at(-1)!.rsi14! < 30 ? "text-emerald-400" : "text-slate-300"
              }`}>
                {bars.at(-1)!.rsi14!.toFixed(1)}
                <span className="text-xs font-normal text-slate-500 ml-1">
                  {bars.at(-1)!.rsi14! > 70 ? "Quá mua" : bars.at(-1)!.rsi14! < 30 ? "Quá bán" : "Trung tính"}
                </span>
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={rsiChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} tickCount={6} />
              <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 9 }} width={28} ticks={[30, 50, 70]} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 11 }}
                formatter={(v: any) => [typeof v === "number" ? v.toFixed(1) : v, "RSI"]} />
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
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 11 }} />
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
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${sigBadge(overall)}`}>{overall}</span>
          </div>
          <div className="flex">
            <div className="w-40 shrink-0 flex flex-col items-center justify-center py-6 border-r border-slate-800">
              <div className={`text-4xl font-black mb-1 ${signals.filter(s => s.signal === "MUA").length > 0 ? "text-emerald-400" : "text-slate-600"}`}>
                {signals.filter(s => s.signal === "MUA").length}
              </div>
              <div className="text-xs text-slate-500">MUA</div>
              <div className="my-2 w-16 h-px bg-slate-700" />
              <div className="text-2xl font-black text-slate-400 mb-1">{signals.filter(s => s.signal === "TRUNG TÍNH").length}</div>
              <div className="text-xs text-slate-500">TRUNG TÍNH</div>
              <div className="my-2 w-16 h-px bg-slate-700" />
              <div className={`text-4xl font-black mb-1 ${signals.filter(s => s.signal === "BÁN").length > 0 ? "text-red-400" : "text-slate-600"}`}>
                {signals.filter(s => s.signal === "BÁN").length}
              </div>
              <div className="text-xs text-slate-500">BÁN</div>
            </div>
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
