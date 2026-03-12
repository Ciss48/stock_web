"use client";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { FinancialSeries } from "@/lib/api";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a78bfa", "#fb923c"];

function ChartTooltip({ active, payload, label, unit = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="text-white font-mono">{p.value != null ? p.value.toLocaleString("vi-VN") : "—"} {unit}</span>
        </p>
      ))}
    </div>
  );
}

function toRows(labels: string[], series: Record<string, (number | null)[]>) {
  return labels.map((label, i) => ({
    label,
    ...Object.fromEntries(Object.entries(series).map(([k, v]) => [k, v[i]])),
  }));
}

// ── Income ───────────────────────────────────────────────────────────────────

export function IncomeChart({ data }: { data: FinancialSeries }) {
  const rows = toRows(data.labels, data.series);
  const keys = [
    { key: "revenue",          name: "Doanh thu",      color: COLORS[0] },
    { key: "operating_profit", name: "LN Hoạt động",   color: COLORS[1] },
    { key: "net_profit",       name: "LN Sau thuế",    color: COLORS[2] },
  ];
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} width={60} />
        <Tooltip content={<ChartTooltip unit="tỷ" />} />
        <Legend />
        {keys.map(k => (
          <Bar key={k.key} dataKey={k.key} name={k.name} fill={k.color} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Balance ──────────────────────────────────────────────────────────────────

export function BalanceChart({ data }: { data: FinancialSeries }) {
  const rows = toRows(data.labels, data.series);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} width={60} />
        <Tooltip content={<ChartTooltip unit="tỷ" />} />
        <Legend />
        <Bar dataKey="total_equity"      name="Vốn chủ sở hữu" fill={COLORS[0]} radius={[2,2,0,0]} stackId="a" />
        <Bar dataKey="total_liabilities" name="Nợ phải trả"    fill={COLORS[3]} radius={[2,2,0,0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Cashflow ──────────────────────────────────────────────────────────────────

export function CashflowChart({ data }: { data: FinancialSeries }) {
  const rows = toRows(data.labels, data.series);
  const keys = [
    { key: "operating_cf", name: "Hoạt động KD",   color: COLORS[0] },
    { key: "investing_cf", name: "Hoạt động ĐT",   color: COLORS[1] },
    { key: "financing_cf", name: "Hoạt động TC",   color: COLORS[2] },
  ];
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} width={60} />
        <Tooltip content={<ChartTooltip unit="tỷ" />} />
        <Legend />
        <ReferenceLine y={0} stroke="#334155" />
        {keys.map(k => (
          <Bar key={k.key} dataKey={k.key} name={k.name} fill={k.color} radius={[2,2,0,0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Ratios ────────────────────────────────────────────────────────────────────

export function RatiosChart({ data }: { data: FinancialSeries }) {
  const rows = toRows(data.labels, data.series);
  return (
    <div className="space-y-6">
      {/* P/E & P/B */}
      <div>
        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">P/E & P/B</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={rows} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} width={40} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="pe" name="P/E" stroke={COLORS[0]} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="pb" name="P/B" stroke={COLORS[1]} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* ROE & ROA */}
      <div>
        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">ROE & ROA (%)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={rows} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} tick={{ fill: "#64748b", fontSize: 10 }} width={50} />
            <Tooltip
              formatter={(v: any) => v != null ? `${(v * 100).toFixed(2)}%` : "—"}
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            />
            <Legend />
            <Line type="monotone" dataKey="roe" name="ROE" stroke={COLORS[2]} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="roa" name="ROA" stroke={COLORS[3]} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
