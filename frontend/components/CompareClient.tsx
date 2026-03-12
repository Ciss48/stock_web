"use client";
import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { api, ComparePrice, CompareRatios } from "@/lib/api";
import { daysAgo } from "@/lib/utils";

const PALETTE = ["#22c55e", "#3b82f6", "#f59e0b", "#a78bfa", "#fb923c"];
const RANGE_OPTIONS = [
  { label: "1T", days: 30  },
  { label: "3T", days: 90  },
  { label: "6T", days: 180 },
  { label: "1N", days: 365 },
  { label: "Tất cả", days: 1825 },
];

const METRIC_LABELS: Record<string, string> = {
  pe:             "P/E",
  pb:             "P/B",
  roe:            "ROE",
  roa:            "ROA",
  eps:            "EPS (VND)",
  debt_to_equity: "Nợ/Vốn",
};

function fmtMetric(key: string, v: number | null) {
  if (v == null) return "—";
  if (key === "roe" || key === "roa") return `${(v * 100).toFixed(2)}%`;
  if (key === "eps") return v.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
  return v.toFixed(2);
}

export default function CompareClient({ allStocks }: {
  allStocks: { ticker: string; name: string; sector: string }[]
}) {
  const [selected, setSelected] = useState<string[]>(["VCB", "CTG"]);
  const [range, setRange]       = useState(365);
  const [priceData, setPriceData] = useState<ComparePrice | null>(null);
  const [ratioData, setRatioData] = useState<CompareRatios | null>(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (selected.length < 2) return;
    setLoading(true);
    Promise.all([
      api.comparePrices(selected, daysAgo(range)),
      api.compareRatios(selected),
    ])
      .then(([p, r]) => { setPriceData(p); setRatioData(r); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selected, range]);

  function toggleTicker(ticker: string) {
    setSelected(prev =>
      prev.includes(ticker)
        ? prev.filter(t => t !== ticker)
        : prev.length < 5 ? [...prev, ticker] : prev
    );
  }

  // Build rows for AreaChart
  const chartRows = priceData
    ? priceData.dates.map((d, i) => ({
        date: d,
        ...Object.fromEntries(
          Object.entries(priceData.series).map(([t, vals]) => [t, vals[i]])
        ),
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Ticker selector */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Chọn mã (tối đa 5)</p>
        <div className="flex flex-wrap gap-2">
          {allStocks.map((s, i) => {
            const active = selected.includes(s.ticker);
            const idx    = selected.indexOf(s.ticker);
            const color  = active ? PALETTE[idx] : undefined;
            return (
              <button
                key={s.ticker}
                onClick={() => toggleTicker(s.ticker)}
                style={active ? { borderColor: color, color, background: `${color}18` } : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  active ? "border-transparent" : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                {active && <span className="w-2 h-2 rounded-full" style={{ background: color }} />}
                {s.ticker}
              </button>
            );
          })}
        </div>
      </div>

      {selected.length < 2 && (
        <div className="text-center text-slate-500 py-12">Chọn ít nhất 2 mã để so sánh</div>
      )}

      {selected.length >= 2 && (
        <>
          {/* Price chart */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Hiệu suất giá (base = 100)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Chuẩn hóa từ ngày đầu tiên trong khoảng chọn</p>
              </div>
              <div className="flex gap-1">
                {RANGE_OPTIONS.map(r => (
                  <button
                    key={r.label}
                    onClick={() => setRange(r.days)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      range === r.days
                        ? "bg-emerald-600 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="h-72 flex items-center justify-center text-slate-500 text-sm">Đang tải...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartRows} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    {selected.map((t, i) => (
                      <linearGradient key={t} id={`grad-${t}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PALETTE[i]} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={PALETTE[i]} stopOpacity={0}    />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} tickCount={8} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} width={45} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => v != null ? v.toFixed(2) : "—"}
                  />
                  <Legend />
                  {selected.map((t, i) => (
                    <Area
                      key={t}
                      type="monotone"
                      dataKey={t}
                      stroke={PALETTE[i]}
                      fill={`url(#grad-${t})`}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Ratios table */}
          {ratioData && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800">
                <h2 className="text-sm font-semibold text-white">So sánh chỉ số tài chính</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kỳ: {Object.values(ratioData.periods).join(", ")}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="px-4 py-3 text-left text-xs text-slate-400 font-semibold uppercase tracking-wider">Chỉ số</th>
                      {ratioData.tickers.map((t, i) => (
                        <th
                          key={t}
                          className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider"
                          style={{ color: PALETTE[selected.indexOf(t)] || "#94a3b8" }}
                        >
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ratioData.comparison.map(row => (
                      <tr key={row.metric} className="market-row">
                        <td className="px-4 py-3 text-slate-300 font-medium">
                          {METRIC_LABELS[row.metric] ?? row.metric}
                        </td>
                        {ratioData.tickers.map(t => (
                          <td key={t} className="px-4 py-3 text-right font-mono text-white">
                            {fmtMetric(row.metric, row[t] as number | null)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
