"use client";
import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ── Mock data (VNM — 8 quarters Q4'23 → Q3'25) ───────────────────────────────
const INCOME = [
  { q:"Q4'23", revenue:14500, netIncome:1250, grossMargin:34.0, ebitMargin:14.0, netMargin:8.6  },
  { q:"Q1'24", revenue:13200, netIncome:1050, grossMargin:32.0, ebitMargin:12.0, netMargin:8.0  },
  { q:"Q2'24", revenue:14800, netIncome:1380, grossMargin:35.0, ebitMargin:15.0, netMargin:9.3  },
  { q:"Q3'24", revenue:15100, netIncome:1420, grossMargin:36.0, ebitMargin:16.0, netMargin:9.4  },
  { q:"Q4'24", revenue:15800, netIncome:1580, grossMargin:37.0, ebitMargin:17.0, netMargin:10.0 },
  { q:"Q1'25", revenue:14200, netIncome:1200, grossMargin:34.0, ebitMargin:14.0, netMargin:8.5  },
  { q:"Q2'25", revenue:15500, netIncome:1450, grossMargin:36.0, ebitMargin:16.0, netMargin:9.4  },
  { q:"Q3'25", revenue:16000, netIncome:1620, grossMargin:38.0, ebitMargin:17.0, netMargin:10.1 },
];

const BALANCE = [
  { q:"Q4'23", currentAssets:18000, nonCurrentAssets:12000, equity:22000, debt:8000,  de:0.36 },
  { q:"Q1'24", currentAssets:17500, nonCurrentAssets:12200, equity:21500, debt:8200,  de:0.38 },
  { q:"Q2'24", currentAssets:19000, nonCurrentAssets:12400, equity:23000, debt:8400,  de:0.37 },
  { q:"Q3'24", currentAssets:19500, nonCurrentAssets:12600, equity:23500, debt:8600,  de:0.37 },
  { q:"Q4'24", currentAssets:20000, nonCurrentAssets:12800, equity:24000, debt:8800,  de:0.37 },
  { q:"Q1'25", currentAssets:19000, nonCurrentAssets:13000, equity:23000, debt:9000,  de:0.39 },
  { q:"Q2'25", currentAssets:20500, nonCurrentAssets:13200, equity:24500, debt:9200,  de:0.38 },
  { q:"Q3'25", currentAssets:21000, nonCurrentAssets:13400, equity:25000, debt:9400,  de:0.38 },
];

const CASHFLOW = [
  { q:"Q4'23", cfo:2800, cfi:-1200, cff:-1200 },
  { q:"Q1'24", cfo:2200, cfi:-800,  cff:-900  },
  { q:"Q2'24", cfo:2600, cfi:-900,  cff:-1100 },
  { q:"Q3'24", cfo:2800, cfi:-1100, cff:-1100 },
  { q:"Q4'24", cfo:3200, cfi:-1300, cff:-1200 },
  { q:"Q1'25", cfo:2400, cfi:-900,  cff:-900  },
  { q:"Q2'25", cfo:2800, cfi:-1000, cff:-1100 },
  { q:"Q3'25", cfo:3100, cfi:-1100, cff:-1200 },
];

const RATIOS = [
  { q:"Q4'23", pe:18.5, pb:4.2, roe:18, roa:8.0,  eps:2800 },
  { q:"Q1'24", pe:19.2, pb:4.5, roe:17, roa:7.5,  eps:2350 },
  { q:"Q2'24", pe:17.8, pb:4.1, roe:19, roa:8.5,  eps:3100 },
  { q:"Q3'24", pe:16.5, pb:3.9, roe:20, roa:9.0,  eps:3180 },
  { q:"Q4'24", pe:15.8, pb:3.8, roe:21, roa:9.5,  eps:3540 },
  { q:"Q1'25", pe:17.2, pb:4.0, roe:18, roa:8.0,  eps:2690 },
  { q:"Q2'25", pe:16.0, pb:3.8, roe:20, roa:9.0,  eps:3250 },
  { q:"Q3'25", pe:15.2, pb:3.6, roe:22, roa:9.8,  eps:3630 },
];

// Radar scores (0-100, higher = better): current Q3'25 and prior Q2'25
const RADAR_DATA = [
  { metric:"P/E",          vnm:59, prior:54, industry:43 },
  { metric:"P/B",          vnm:55, prior:52, industry:44 },
  { metric:"ROE",          vnm:73, prior:67, industry:60 },
  { metric:"ROA",          vnm:65, prior:60, industry:53 },
  { metric:"Nợ/Vốn",      vnm:82, prior:82, industry:80 },
  { metric:"Thanh khoản",  vnm:74, prior:73, industry:73 },
];

// Cashflow QoQ comparison data
const CF_COMPARE = [
  { name:"CFO",  current:3100,  prior:2800  },
  { name:"CFI",  current:-1100, prior:-1000 },
  { name:"CFF",  current:-1200, prior:-1100 },
  { name:"FCF",  current:2000,  prior:1800  },
];

// Waterfall (latest Q3'25 normal mode)
const WATERFALL = [
  { name:"CFO",       base:0,    pos:3100, neg:0,    label:"+3.100 tỷ" },
  { name:"CFI",       base:2000, pos:0,    neg:1100, label:"-1.100 tỷ" },
  { name:"CFF",       base:800,  pos:0,    neg:1200, label:"-1.200 tỷ" },
  { name:"Tiền ròng", base:0,    pos:800,  neg:0,    label:"+800 tỷ"   },
];

const FCF_DATA = CASHFLOW.map(d => ({ q:d.q, fcf:d.cfo + d.cfi }));

const DONUT_CURR = [
  { name:"Tài sản ngắn hạn", value:21000 },
  { name:"Tài sản dài hạn",  value:13400 },
];
const DONUT_PRIOR = [
  { name:"Tài sản ngắn hạn", value:20500 },
  { name:"Tài sản dài hạn",  value:13200 },
];
const DONUT_COLORS = ["#22c55e","#3b82f6"];

// ── Income with QoQ delta fields ──────────────────────────────────────────────
const INCOME_DELTA = INCOME.map((d, i) => ({
  ...d,
  grossProfit: Math.round(d.revenue * d.grossMargin / 100),
  revDelta:    i > 0 ? ((d.revenue    - INCOME[i-1].revenue)    / INCOME[i-1].revenue    * 100) : 0,
  niDelta:     i > 0 ? ((d.netIncome  - INCOME[i-1].netIncome)  / INCOME[i-1].netIncome  * 100) : 0,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
const vnd = (v: number) => v.toLocaleString("vi-VN");
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const dPct = (curr: number, prev: number) =>
  prev !== 0 ? (curr - prev) / Math.abs(prev) * 100 : 0;

type Grade = "A" | "B" | "C" | "D";
const gradeStyle: Record<Grade, string> = {
  A: "text-emerald-400 bg-emerald-950/60 border-emerald-800",
  B: "text-sky-400    bg-sky-950/60    border-sky-800",
  C: "text-amber-400  bg-amber-950/60  border-amber-800",
  D: "text-red-400    bg-red-950/60    border-red-800",
};
const SCORES: { label:string; value:string; grade:Grade; note:string }[] = [
  { label:"Tăng trưởng DT",    value:"+5.96%",    grade:"B", note:"Q3'25 vs Q3'24"          },
  { label:"Biên lợi nhuận",    value:"10.1%",     grade:"A", note:"Net margin"               },
  { label:"Dòng tiền tự do",   value:"+2.000 tỷ", grade:"A", note:"FCF Q3'25"                },
  { label:"Đòn bẩy tài chính", value:"D/E 0.38",  grade:"A", note:"Nợ thấp"                  },
  { label:"Hiệu quả vốn",      value:"ROE 22%",   grade:"A", note:"Cao hơn trung bình ngành" },
];

const TT = { background:"#1e293b", border:"1px solid #334155", borderRadius:6, fontSize:11 };
const CARD  = "bg-slate-900 rounded-xl border border-slate-800 p-4";
const STITLE = "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";
const CTITLE = "text-sm font-semibold text-white mb-4";

// ── Delta badge ───────────────────────────────────────────────────────────────
function DeltaBadge({ curr, prev, unit="%" }: { curr:number; prev:number; unit?:string }) {
  const p = dPct(curr, prev);
  const pos = p >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${pos ? "text-emerald-400" : "text-red-400"}`}>
      {pos ? "▲" : "▼"} {Math.abs(p).toFixed(1)}{unit} QoQ
    </span>
  );
}

// ── Metric card with QoQ delta ────────────────────────────────────────────────
function MetricCard({
  label, curr, prev, format, qoq,
}: { label:string; curr:number; prev:number; format:(v:number)=>string; qoq:boolean }) {
  const p = dPct(curr, prev);
  const pos = p >= 0;
  return (
    <div className="flex-1 min-w-[130px] bg-slate-800/60 rounded-lg p-3 border border-slate-700">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-white">{format(curr)}</div>
      {qoq && (
        <div className={`flex items-center gap-1 text-xs mt-1.5 ${pos ? "text-emerald-400" : "text-red-400"}`}>
          <span>{pos ? "▲" : "▼"}</span>
          <span>{pct(p)} QoQ</span>
          <span className="text-slate-500 ml-0.5">vs {format(prev)}</span>
        </div>
      )}
    </div>
  );
}

// ── QoQ tooltip for income bar ────────────────────────────────────────────────
function IncomeTooltip({ active, payload, label, qoq }: any) {
  if (!active || !payload?.length) return null;
  const idx = INCOME_DELTA.findIndex(d => d.q === label);
  return (
    <div style={TT} className="p-2 space-y-1">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p: any) => {
        const isRev = p.dataKey === "revenue";
        const delta = idx > 0 ? (isRev ? INCOME_DELTA[idx].revDelta : INCOME_DELTA[idx].niDelta) : null;
        return (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span style={{ color: p.color }}>■</span>
            <span className="text-slate-300">{p.name}:</span>
            <span className="text-white font-mono">{vnd(p.value)} tỷ</span>
            {qoq && delta !== null && idx > 0 && (
              <span className={delta >= 0 ? "text-emerald-400" : "text-red-400"}>
                {delta >= 0 ? "▲" : "▼"}{Math.abs(delta).toFixed(1)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── QoQ Summary data ──────────────────────────────────────────────────────────
interface SummaryRow {
  section: string; metric: string;
  curr: string; prev: string;
  delta: string; deltaPct: string;
  positive: boolean | null; // null = neutral
}

function buildSummary(): SummaryRow[] {
  const ci = INCOME_DELTA[7]; const pi = INCOME_DELTA[6];
  const cb = BALANCE[7];      const pb = BALANCE[6];
  const cc = CASHFLOW[7];     const pc = CASHFLOW[6];
  const cr = RATIOS[7];       const pr = RATIOS[6];

  const row = (
    section: string, metric: string,
    curr: number, prev: number,
    fmt: (v:number)=>string, higherBetter = true
  ): SummaryRow => {
    const d = curr - prev;
    const dp = dPct(curr, prev);
    const pos = Math.abs(dp) <= 1 ? null : higherBetter ? dp > 0 : dp < 0;
    return { section, metric, curr: fmt(curr), prev: fmt(prev),
      delta: `${d >= 0 ? "+" : ""}${fmt(d).replace("-","−")}`,
      deltaPct: pct(dp), positive: pos };
  };

  return [
    row("Income","Doanh thu (tỷ)",      ci.revenue,   pi.revenue,   vnd),
    row("Income","Lợi nhuận gộp (tỷ)",  ci.grossProfit,pi.grossProfit,vnd),
    row("Income","Lợi nhuận ròng (tỷ)", ci.netIncome, pi.netIncome, vnd),
    row("Income","Gross Margin",         ci.grossMargin,pi.grossMargin, v=>`${v.toFixed(1)}%`),
    row("Income","EBIT Margin",          ci.ebitMargin, pi.ebitMargin,  v=>`${v.toFixed(1)}%`),
    row("Income","Net Margin",           ci.netMargin,  pi.netMargin,   v=>`${v.toFixed(1)}%`),
    row("Balance","Tổng tài sản (tỷ)",   cb.currentAssets+cb.nonCurrentAssets, pb.currentAssets+pb.nonCurrentAssets, vnd),
    row("Balance","Tài sản ngắn hạn (tỷ)",cb.currentAssets,pb.currentAssets,vnd),
    row("Balance","Vốn chủ sở hữu (tỷ)", cb.equity, pb.equity, vnd),
    row("Balance","Nợ phải trả (tỷ)",     cb.debt,   pb.debt,   vnd, false),
    row("Balance","D/E Ratio",            cb.de,     pb.de,     v=>v.toFixed(2), false),
    row("Cashflow","CFO (tỷ)",            cc.cfo,  pc.cfo,  vnd),
    row("Cashflow","CFI (tỷ)",            cc.cfi,  pc.cfi,  vnd, false),
    row("Cashflow","CFF (tỷ)",            cc.cff,  pc.cff,  vnd, false),
    row("Cashflow","FCF (tỷ)",            cc.cfo+cc.cfi, pc.cfo+pc.cfi, vnd),
    row("Ratio","P/E",   cr.pe,  pr.pe,  v=>v.toFixed(1), false),
    row("Ratio","P/B",   cr.pb,  pr.pb,  v=>v.toFixed(1), false),
    row("Ratio","ROE",   cr.roe, pr.roe, v=>`${v}%`),
    row("Ratio","ROA",   cr.roa, pr.roa, v=>`${v.toFixed(1)}%`),
    row("Ratio","EPS (₫)",cr.eps, pr.eps, v=>vnd(v)),
  ];
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(rows: SummaryRow[]) {
  const header = "Nhóm,Chỉ số,Quý này (Q3'25),Quý trước (Q2'25),Δ tuyệt đối,Δ%,Xu hướng\n";
  const body = rows.map(r =>
    `"${r.section}","${r.metric}","${r.curr}","${r.prev}","${r.delta}","${r.deltaPct}","${
      r.positive === null ? "●" : r.positive ? "▲" : "▼"
    }"`
  ).join("\n");
  const blob = new Blob(["\uFEFF" + header + body], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href:url, download:"vnm_qoq.csv" });
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════
export default function FundamentalClient() {
  const [period, setPeriod] = useState<"quarter"|"year">("quarter");
  const [qoq,    setQoq]    = useState(true);
  const summary = buildSummary();

  const n = INCOME.length - 1;
  const ci = INCOME_DELTA[n]; const pi = INCOME_DELTA[n-1];
  const cb = BALANCE[n];      const pb = BALANCE[n-1];

  return (
    <div className="space-y-8">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">VNM — Vinamilk</h1>
          <p className="text-slate-400 text-sm mt-0.5">Phân tích tài chính cơ bản · 8 quý gần nhất</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["quarter","year"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}>
              {p === "quarter" ? "Quý" : "Năm"}
            </button>
          ))}
          <button
            onClick={() => setQoq(v => !v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border ${
              qoq
                ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-900/40"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
            }`}>
            {qoq ? "✓ " : ""}So sánh QoQ
          </button>
        </div>
      </div>

      {/* ── Scorecard ─────────────────────────────────────────────────────── */}
      <div className={CARD}>
        <p className={STITLE}>Đánh giá sức khỏe tài chính</p>
        <div className="flex flex-wrap gap-3 mt-3">
          <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-xl border-2 shrink-0 ${gradeStyle["A"]}`}>
            <span className="text-4xl font-black">A</span>
            <span className="text-xs mt-1 opacity-70">Tổng thể</span>
          </div>
          {SCORES.map(s => (
            <div key={s.label} className="flex-1 min-w-[130px] bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-start justify-between">
                <span className="text-xs text-slate-400">{s.label}</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${gradeStyle[s.grade]}`}>{s.grade}</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2.2  INCOME STATEMENT                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className={STITLE}>Kết quả kinh doanh (Income Statement)</h2>

        {/* QoQ metric cards */}
        <div className="flex flex-wrap gap-3">
          <MetricCard label="Doanh thu (tỷ)"       curr={ci.revenue}     prev={pi.revenue}     format={vnd}                  qoq={qoq} />
          <MetricCard label="Lợi nhuận gộp (tỷ)"   curr={ci.grossProfit} prev={pi.grossProfit} format={vnd}                  qoq={qoq} />
          <MetricCard label="Lợi nhuận ròng (tỷ)"  curr={ci.netIncome}   prev={pi.netIncome}   format={vnd}                  qoq={qoq} />
          <MetricCard label="Net Margin"            curr={ci.netMargin}   prev={pi.netMargin}   format={v=>`${v.toFixed(1)}%`} qoq={qoq} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue + Net Income grouped bar */}
          <div className={CARD}>
            <p className={CTITLE}>Doanh thu &amp; Lợi nhuận ròng (tỷ VNĐ)</p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={INCOME_DELTA} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="q" tick={{ fill:"#64748b", fontSize:10 }} />
                <YAxis tick={{ fill:"#64748b", fontSize:10 }} width={45} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<IncomeTooltip qoq={qoq} />} />
                <Legend />
                <Bar dataKey="revenue"   name="Doanh thu"      fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={20}>
                  {INCOME_DELTA.map((_, i) => (
                    <Cell key={i}
                      fill="#3b82f6"
                      opacity={qoq && i === n ? 1 : qoq && i === n-1 ? 0.65 : 0.85}
                      stroke={qoq && i === n ? "#93c5fd" : "none"}
                      strokeWidth={qoq && i === n ? 1.5 : 0}
                    />
                  ))}
                </Bar>
                <Bar dataKey="netIncome" name="Lợi nhuận ròng" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={20}>
                  {INCOME_DELTA.map((_, i) => (
                    <Cell key={i}
                      fill="#22c55e"
                      opacity={qoq && i === n ? 1 : qoq && i === n-1 ? 0.65 : 0.85}
                      stroke={qoq && i === n ? "#86efac" : "none"}
                      strokeWidth={qoq && i === n ? 1.5 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Margin lines */}
          <div className={CARD}>
            <div className="flex items-start justify-between mb-4">
              <p className={CTITLE} style={{marginBottom:0}}>Biên lợi nhuận (%)</p>
              {qoq && (
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-400">Gross <DeltaBadge curr={ci.grossMargin} prev={pi.grossMargin} unit="pp" /></span>
                  <span className="text-amber-400">Net <DeltaBadge curr={ci.netMargin} prev={pi.netMargin} unit="pp" /></span>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={INCOME} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="q" tick={{ fill:"#64748b", fontSize:10 }} />
                <YAxis domain={[0,45]} tick={{ fill:"#64748b", fontSize:10 }} width={32} tickFormatter={v=>`${v}%`} />
                <Tooltip contentStyle={TT} formatter={(v:number) => [`${v.toFixed(1)}%`]} />
                <Legend />
                <Line dataKey="grossMargin" name="Gross Margin" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line dataKey="ebitMargin"  name="EBIT Margin"  stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line dataKey="netMargin"   name="Net Margin"   stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2.3  BALANCE SHEET                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className={STITLE}>Bảng cân đối kế toán (Balance Sheet)</h2>

        {/* QoQ balance metric cards */}
        <div className="flex flex-wrap gap-3">
          <MetricCard label="Tổng tài sản (tỷ)"   curr={cb.currentAssets+cb.nonCurrentAssets} prev={pb.currentAssets+pb.nonCurrentAssets} format={vnd} qoq={qoq} />
          <MetricCard label="Vốn chủ sở hữu (tỷ)" curr={cb.equity} prev={pb.equity} format={vnd}             qoq={qoq} />
          <MetricCard label="Nợ phải trả (tỷ)"     curr={cb.debt}   prev={pb.debt}   format={vnd}             qoq={qoq} />
          <MetricCard label="D/E Ratio"             curr={cb.de}     prev={pb.de}     format={v=>v.toFixed(2)} qoq={qoq} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Donut: normal = single, QoQ = side-by-side */}
          <div className={CARD}>
            <p className={CTITLE}>{qoq ? "Cơ cấu tài sản: QoQ" : "Cơ cấu tài sản (Q3'25)"}</p>
            {qoq ? (
              <div className="flex gap-2">
                {[
                  { label:"Q3'25", data:DONUT_CURR },
                  { label:"Q2'25", data:DONUT_PRIOR },
                ].map(({ label, data }) => (
                  <div key={label} className="flex-1">
                    <p className="text-xs text-center text-slate-400 mb-1">{label}</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                          dataKey="value" label={({ percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                          {data.map((_,i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                        </Pie>
                        <Tooltip contentStyle={TT} formatter={(v:number) => [`${vnd(v)} tỷ`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={DONUT_CURR} cx="50%" cy="50%" innerRadius={55} outerRadius={82}
                    dataKey="value" label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {DONUT_CURR.map((_,i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={TT} formatter={(v:number) => [`${vnd(v)} tỷ`]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Stacked bar: Equity vs Debt */}
          <div className={CARD}>
            <p className={CTITLE}>Cơ cấu nguồn vốn (tỷ VNĐ)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={BALANCE} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="q" tick={{ fill:"#64748b", fontSize:9 }} />
                <YAxis tick={{ fill:"#64748b", fontSize:9 }} width={45} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TT} formatter={(v:number) => [`${vnd(v)} tỷ`]} />
                <Legend />
                <Bar dataKey="equity" name="Vốn CSH" stackId="a" maxBarSize={24}>
                  {BALANCE.map((_,i) => (
                    <Cell key={i} fill="#22c55e"
                      opacity={qoq ? (i >= n-1 ? 1 : 0.45) : 0.85}
                      stroke={qoq && i >= n-1 ? "#86efac" : "none"} strokeWidth={qoq && i >= n-1 ? 1.5 : 0}
                    />
                  ))}
                </Bar>
                <Bar dataKey="debt" name="Nợ phải trả" stackId="a" maxBarSize={24} radius={[3,3,0,0]}>
                  {BALANCE.map((_,i) => (
                    <Cell key={i} fill="#ef4444"
                      opacity={qoq ? (i >= n-1 ? 1 : 0.45) : 0.85}
                      stroke={qoq && i >= n-1 ? "#fca5a5" : "none"} strokeWidth={qoq && i >= n-1 ? 1.5 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* D/E line */}
          <div className={CARD}>
            <p className={CTITLE}>Hệ số nợ D/E</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={BALANCE} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="q" tick={{ fill:"#64748b", fontSize:9 }} />
                <YAxis domain={[0,0.6]} tick={{ fill:"#64748b", fontSize:9 }} width={32} />
                <Tooltip contentStyle={TT} formatter={(v:number) => [v.toFixed(2),"D/E"]} />
                <ReferenceLine y={0.5} stroke="#f59e0b" strokeDasharray="4 2"
                  label={{ value:"0.5 (ngưỡng)", fill:"#f59e0b", fontSize:9 }} />
                <Line dataKey="de" name="D/E" stroke="#f59e0b" strokeWidth={2} dot={{ fill:"#f59e0b", r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2.4  CASHFLOW                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className={STITLE}>Lưu chuyển tiền tệ (Cashflow)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Waterfall (normal) / Grouped bars (QoQ) */}
          <div className={CARD}>
            <p className={CTITLE}>
              {qoq ? "So sánh dòng tiền: Q3'25 vs Q2'25 (tỷ VNĐ)" : "Dòng tiền 3 hoạt động — Q3'25 (tỷ VNĐ)"}
            </p>
            <ResponsiveContainer width="100%" height={230}>
              {qoq ? (
                <BarChart data={CF_COMPARE} margin={{ top:4, right:8, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill:"#94a3b8", fontSize:11 }} />
                  <YAxis tick={{ fill:"#64748b", fontSize:10 }} width={50} tickFormatter={v=>vnd(v)} />
                  <Tooltip contentStyle={TT} formatter={(v:number) => [`${vnd(v)} tỷ`]} />
                  <Legend />
                  <Bar dataKey="current" name="Q3'25" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={22} />
                  <Bar dataKey="prior"   name="Q2'25" fill="#64748b" radius={[3,3,0,0]} maxBarSize={22} />
                </BarChart>
              ) : (
                <BarChart data={WATERFALL} margin={{ top:4, right:8, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill:"#94a3b8", fontSize:11 }} />
                  <YAxis tick={{ fill:"#64748b", fontSize:10 }} width={45} />
                  <Tooltip contentStyle={TT} formatter={(_:any,__:any,p:any) => [p.payload.label,""]} />
                  <Bar dataKey="base" stackId="w" fill="transparent" />
                  <Bar dataKey="pos"  stackId="w" fill="#22c55e" radius={[3,3,0,0]} />
                  <Bar dataKey="neg"  stackId="w" fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* FCF line */}
          <div className={CARD}>
            <p className={CTITLE}>Free Cash Flow (tỷ VNĐ)</p>
            <p className="text-xs text-slate-500 -mt-3 mb-4">FCF = CFO + CFI (CAPEX)</p>
            <ResponsiveContainer width="100%" height={195}>
              <ComposedChart data={FCF_DATA} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="q" tick={{ fill:"#64748b", fontSize:10 }} />
                <YAxis tick={{ fill:"#64748b", fontSize:10 }} width={45} />
                <Tooltip contentStyle={TT} formatter={(v:number) => [`${vnd(v)} tỷ`,"FCF"]} />
                <ReferenceLine y={0} stroke="#475569" />
                <Bar dataKey="fcf" maxBarSize={20} radius={[3,3,0,0]}>
                  {FCF_DATA.map((d,i) => <Cell key={i} fill={d.fcf>=0?"#22c55e88":"#ef444488"} />)}
                </Bar>
                <Line dataKey="fcf" stroke="#22c55e" strokeWidth={2} dot={{ fill:"#22c55e",r:3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* QoQ cashflow comparison table */}
        {qoq && (
          <div className={CARD}>
            <p className={CTITLE}>So sánh QoQ — Dòng tiền</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    {["Hoạt động","Q3'25","Q2'25","Δ tuyệt đối","Δ%"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CF_COMPARE.map(r => {
                    const d  = r.current - r.prior;
                    const dp = dPct(r.current, r.prior);
                    const pos = r.name === "CFI" || r.name === "CFF" ? dp < 0 : dp > 0;
                    return (
                      <tr key={r.name} className="market-row">
                        <td className="px-4 py-2.5 text-slate-300 font-medium">{r.name}</td>
                        <td className="px-4 py-2.5 font-mono text-white">{vnd(r.current)} tỷ</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">{vnd(r.prior)} tỷ</td>
                        <td className={`px-4 py-2.5 font-mono ${pos?"text-emerald-400":"text-red-400"}`}>
                          {d>=0?"+":""}{vnd(d)} tỷ
                        </td>
                        <td className={`px-4 py-2.5 font-semibold ${pos?"text-emerald-400":"text-red-400"}`}>
                          {pct(dp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2.5  RATIOS                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className={STITLE}>Chỉ số định giá &amp; Hiệu quả (Ratios)</h2>

        {/* Quick metrics table */}
        <div className={CARD}>
          <p className={CTITLE}>Chỉ số nhanh{qoq ? " — So sánh QoQ" : " — Q3'25"}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-2 text-left text-xs text-slate-500">Chỉ số</th>
                  <th className="px-4 py-2 text-right text-xs text-slate-500">Q3&apos;25</th>
                  {qoq && <th className="px-4 py-2 text-right text-xs text-slate-500">Q2&apos;25</th>}
                  {qoq && <th className="px-4 py-2 text-right text-xs text-slate-500">Δ</th>}
                  {qoq && <th className="px-4 py-2 text-right text-xs text-slate-500">Δ%</th>}
                  {qoq && <th className="px-4 py-2 text-center text-xs text-slate-500">Xu hướng</th>}
                </tr>
              </thead>
              <tbody>
                {[
                  { label:"P/E",   curr:15.2, prev:16.0, fmt:(v:number)=>`${v.toFixed(1)}x`, higherBetter:false },
                  { label:"P/B",   curr:3.6,  prev:3.8,  fmt:(v:number)=>`${v.toFixed(1)}x`, higherBetter:false },
                  { label:"ROE",   curr:22,   prev:20,   fmt:(v:number)=>`${v}%`,            higherBetter:true  },
                  { label:"ROA",   curr:9.8,  prev:9.0,  fmt:(v:number)=>`${v.toFixed(1)}%`, higherBetter:true  },
                  { label:"D/E",   curr:0.38, prev:0.38, fmt:(v:number)=>`${v.toFixed(2)}x`, higherBetter:false },
                  { label:"EPS",   curr:3630, prev:3250, fmt:(v:number)=>`${vnd(v)}₫`,       higherBetter:true  },
                ].map(m => {
                  const d  = m.curr - m.prev;
                  const dp = dPct(m.curr, m.prev);
                  const pos = m.higherBetter ? dp > 1 : dp < -1;
                  const neutral = Math.abs(dp) <= 1;
                  return (
                    <tr key={m.label} className="market-row">
                      <td className="px-4 py-2.5 text-slate-300 font-medium">{m.label}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-white">{m.fmt(m.curr)}</td>
                      {qoq && <td className="px-4 py-2.5 text-right font-mono text-slate-400">{m.fmt(m.prev)}</td>}
                      {qoq && <td className={`px-4 py-2.5 text-right font-mono ${neutral?"text-slate-400":pos?"text-emerald-400":"text-red-400"}`}>
                        {d>=0?"+":""}{m.fmt(d).replace(m.fmt(0),"").trim() || m.fmt(d)}
                      </td>}
                      {qoq && <td className={`px-4 py-2.5 text-right font-semibold ${neutral?"text-slate-400":pos?"text-emerald-400":"text-red-400"}`}>
                        {pct(dp)}
                      </td>}
                      {qoq && <td className={`px-4 py-2.5 text-center text-base ${neutral?"text-slate-400":pos?"text-emerald-400":"text-red-400"}`}>
                        {neutral ? "●" : pos ? "▲" : "▼"}
                      </td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Radar */}
          <div className={CARD}>
            <p className={CTITLE}>{qoq ? "Phân tích đa chiều: QoQ" : "Phân tích đa chiều vs Ngành"}</p>
            <p className="text-xs text-slate-500 -mt-3 mb-4">Điểm chuẩn hoá (100 = tốt nhất)</p>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="metric" tick={{ fill:"#94a3b8", fontSize:10 }} />
                <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fill:"#475569", fontSize:8 }} />
                <Radar name="VNM (Q3'25)"  dataKey="vnm"      stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} />
                {qoq
                  ? <Radar name="VNM (Q2'25)" dataKey="prior"    stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.15} />
                  : <Radar name="Ngành"       dataKey="industry" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} />
                }
                <Legend />
                <Tooltip contentStyle={TT} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* ROE / ROA bar */}
          <div className={CARD}>
            <p className={CTITLE}>{qoq ? "ROE & ROA: Q3'25 vs Q2'25 (%)" : "ROE & ROA theo quý (%)"}</p>
            <ResponsiveContainer width="100%" height={240}>
              {qoq ? (
                <BarChart
                  data={[
                    { name:"ROE", current:22, prior:20 },
                    { name:"ROA", current:9.8, prior:9.0 },
                  ]}
                  margin={{ top:4, right:8, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill:"#94a3b8", fontSize:12 }} />
                  <YAxis tick={{ fill:"#64748b", fontSize:10 }} width={32} tickFormatter={v=>`${v}%`} />
                  <Tooltip contentStyle={TT} formatter={(v:number) => [`${v.toFixed(1)}%`]} />
                  <Legend />
                  <Bar dataKey="current" name="Q3'25" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={32} />
                  <Bar dataKey="prior"   name="Q2'25" fill="#64748b" radius={[3,3,0,0]} maxBarSize={32} />
                </BarChart>
              ) : (
                <BarChart data={RATIOS} margin={{ top:4, right:8, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="q" tick={{ fill:"#64748b", fontSize:9 }} />
                  <YAxis tick={{ fill:"#64748b", fontSize:9 }} width={32} tickFormatter={v=>`${v}%`} />
                  <Tooltip contentStyle={TT} formatter={(v:number) => [`${v.toFixed(1)}%`]} />
                  <Legend />
                  <Bar dataKey="roe" name="ROE" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={16} />
                  <Bar dataKey="roa" name="ROA" fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={16} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* EPS line */}
          <div className={CARD}>
            <p className={CTITLE}>EPS tăng trưởng (VNĐ)</p>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={RATIOS} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="q" tick={{ fill:"#64748b", fontSize:9 }} />
                <YAxis tick={{ fill:"#64748b", fontSize:9 }} width={45} tickFormatter={v=>vnd(v)} />
                <Tooltip contentStyle={TT} formatter={(v:number) => [`${vnd(v)}₫`,"EPS"]} />
                <Bar dataKey="eps" fill="#a78bfa44" maxBarSize={22} radius={[3,3,0,0]} />
                <Line dataKey="eps" stroke="#a78bfa" strokeWidth={2} dot={{ fill:"#a78bfa",r:3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2.6  QoQ SUMMARY TABLE (only in QoQ mode)                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {qoq && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={STITLE} style={{marginBottom:0}}>Bảng tổng hợp so sánh QoQ — Tất cả chỉ số</h2>
            <button
              onClick={() => exportCSV(summary)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors">
              ↓ Xuất CSV
            </button>
          </div>
          <div className={`${CARD} overflow-hidden p-0`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    {["Nhóm","Chỉ số","Q3'25","Q2'25","Δ tuyệt đối","Δ%","Xu hướng"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row, i) => {
                    const prev = summary[i-1];
                    const showSection = !prev || prev.section !== row.section;
                    return (
                      <tr key={i} className="market-row">
                        <td className="px-4 py-2.5">
                          {showSection && (
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              {row.section}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">{row.metric}</td>
                        <td className="px-4 py-2.5 font-mono text-white">{row.curr}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">{row.prev}</td>
                        <td className={`px-4 py-2.5 font-mono ${
                          row.positive === null ? "text-slate-400" : row.positive ? "text-emerald-400" : "text-red-400"
                        }`}>{row.delta}</td>
                        <td className={`px-4 py-2.5 font-semibold ${
                          row.positive === null ? "text-slate-400" : row.positive ? "text-emerald-400" : "text-red-400"
                        }`}>{row.deltaPct}</td>
                        <td className={`px-4 py-2.5 text-center text-base ${
                          row.positive === null ? "text-slate-500" : row.positive ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {row.positive === null ? "●" : row.positive ? "▲" : "▼"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
