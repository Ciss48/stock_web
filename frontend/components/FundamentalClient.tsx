"use client";
import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ── Row types ─────────────────────────────────────────────────────────────────

interface IncomeRow  { q:string; revenue:number; netIncome:number; grossProfit:number; grossMargin:number; ebitMargin:number; netMargin:number; revDelta:number; niDelta:number }
interface BalanceRow { q:string; equity:number; debt:number; de:number; totalAssets:number }
interface CfRow      { q:string; cfo:number; cfi:number; cff:number }
interface RatioRow   { q:string; pe:number; pb:number; roe:number; roa:number; eps:number; de:number }
interface FinSeries  { ticker:string; labels:string[]; series:Record<string,(number|null)[]>; unit?:string }
interface SummaryRow { section:string; metric:string; curr:string; prev:string; delta:string; deltaPct:string; positive:boolean|null }

// ── Transform helpers ─────────────────────────────────────────────────────────

function n(v:number|null|undefined):number { return v ?? 0 }

function transformIncome(s:FinSeries): IncomeRow[] {
  return s.labels.map((q,i) => {
    const rev = n(s.series.revenue?.[i]);
    const gp  = n(s.series.gross_profit?.[i]);
    const op  = n(s.series.operating_profit?.[i]);
    const np  = n(s.series.net_profit?.[i]);
    return { q, revenue:rev, netIncome:np, grossProfit:gp,
      grossMargin: rev ? gp/rev*100 : 0,
      ebitMargin:  rev ? op/rev*100 : 0,
      netMargin:   rev ? np/rev*100 : 0,
      revDelta:0, niDelta:0 };
  });
}

function withDeltas(rows:IncomeRow[]):IncomeRow[] {
  return rows.map((r,i) => ({
    ...r,
    revDelta: i>0 && rows[i-1].revenue ? (r.revenue - rows[i-1].revenue)/Math.abs(rows[i-1].revenue)*100 : 0,
    niDelta:  i>0 && rows[i-1].netIncome ? (r.netIncome - rows[i-1].netIncome)/Math.abs(rows[i-1].netIncome)*100 : 0,
  }));
}

function transformBalance(bs:FinSeries, rs:FinSeries): BalanceRow[] {
  return bs.labels.map((q,i) => {
    const eq   = n(bs.series.total_equity?.[i]);
    const liab = n(bs.series.total_liabilities?.[i]);
    const assets = n(bs.series.total_assets?.[i]);
    const rIdx = rs.labels.indexOf(q);
    const de   = rIdx>=0 && rs.series.debt_to_equity?.[rIdx] != null
                 ? n(rs.series.debt_to_equity[rIdx]) : (eq ? liab/eq : 0);
    return { q, equity:eq, debt:liab, de:Math.round(de*100)/100, totalAssets:assets };
  });
}

function transformCashflow(s:FinSeries): CfRow[] {
  return s.labels.map((q,i) => ({
    q,
    cfo: n(s.series.operating_cf?.[i]),
    cfi: n(s.series.investing_cf?.[i]),
    cff: n(s.series.financing_cf?.[i]),
  }));
}

function transformRatios(s:FinSeries): RatioRow[] {
  return s.labels.map((q,i) => ({
    q,
    pe:  n(s.series.pe?.[i]),
    pb:  n(s.series.pb?.[i]),
    roe: Math.round(n(s.series.roe?.[i])*100*10)/10, // fraction → %
    roa: Math.round(n(s.series.roa?.[i])*100*10)/10,
    eps: n(s.series.eps?.[i]),
    de:  n(s.series.debt_to_equity?.[i]),
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const vnd  = (v:number) => Math.round(v).toLocaleString("vi-VN");
const pct  = (v:number) => `${v>=0?"+":""}${v.toFixed(1)}%`;
const dPct = (c:number, p:number) => p!==0 ? (c-p)/Math.abs(p)*100 : 0;
const TT   = { background:"#1e293b", border:"1px solid #334155", borderRadius:6, fontSize:11 };
const CARD   = "bg-slate-900 rounded-xl border border-slate-800 p-4";
const STITLE = "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";
const CTITLE = "text-sm font-semibold text-white mb-4";
const DONUT_COLORS = ["#22c55e","#ef4444"];

// ── Delta badge ───────────────────────────────────────────────────────────────

function DeltaBadge({ curr,prev,unit="%" }:{ curr:number; prev:number; unit?:string }) {
  const p = dPct(curr,prev); const pos = p>=0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${pos?"text-emerald-400":"text-red-400"}`}>
      {pos?"▲":"▼"} {Math.abs(p).toFixed(1)}{unit} QoQ
    </span>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label,curr,prev,format,qoq }:{ label:string; curr:number; prev:number; format:(v:number)=>string; qoq:boolean }) {
  const p=dPct(curr,prev); const pos=p>=0;
  return (
    <div className="flex-1 min-w-[130px] bg-slate-800/60 rounded-lg p-3 border border-slate-700">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-white">{format(curr)}</div>
      {qoq&&(
        <div className={`flex items-center gap-1 text-xs mt-1.5 ${pos?"text-emerald-400":"text-red-400"}`}>
          <span>{pos?"▲":"▼"}</span><span>{pct(p)} QoQ</span>
          <span className="text-slate-500 ml-0.5">vs {format(prev)}</span>
        </div>
      )}
    </div>
  );
}

function buildSummary(income:IncomeRow[], balance:BalanceRow[], cf:CfRow[], ratios:RatioRow[]): SummaryRow[] {
  if (!income.length || !balance.length || !cf.length || !ratios.length) return [];
  const n_ = (arr:any[]) => arr.length-1;
  const ci=income[n_(income)];  const pi=income[Math.max(0,n_(income)-1)];
  const cb=balance[n_(balance)]; const pb=balance[Math.max(0,n_(balance)-1)];
  const cc=cf[n_(cf)];           const pc=cf[Math.max(0,n_(cf)-1)];
  const cr=ratios[n_(ratios)];   const pr=ratios[Math.max(0,n_(ratios)-1)];

  const row=(section:string,metric:string,curr:number,prev:number,fmt:(v:number)=>string,hb=true):SummaryRow=>{
    const d=curr-prev; const dp=dPct(curr,prev);
    const pos=Math.abs(dp)<=1?null:hb?dp>0:dp<0;
    return {section,metric,curr:fmt(curr),prev:fmt(prev),
      delta:`${d>=0?"+":""}${fmt(Math.abs(d)).replace("-","−")}`,
      deltaPct:pct(dp),positive:pos};
  };
  return [
    row("Income","Doanh thu (tỷ)",      ci.revenue,   pi.revenue,   vnd),
    row("Income","Lợi nhuận gộp (tỷ)",  ci.grossProfit,pi.grossProfit,vnd),
    row("Income","Lợi nhuận ròng (tỷ)", ci.netIncome, pi.netIncome, vnd),
    row("Income","Gross Margin",         ci.grossMargin,pi.grossMargin, v=>`${v.toFixed(1)}%`),
    row("Income","EBIT Margin",          ci.ebitMargin, pi.ebitMargin,  v=>`${v.toFixed(1)}%`),
    row("Income","Net Margin",           ci.netMargin,  pi.netMargin,   v=>`${v.toFixed(1)}%`),
    row("Balance","Tổng tài sản (tỷ)",   cb.totalAssets, pb.totalAssets, vnd),
    row("Balance","Vốn chủ sở hữu (tỷ)", cb.equity, pb.equity, vnd),
    row("Balance","Nợ phải trả (tỷ)",     cb.debt,   pb.debt,   vnd, false),
    row("Balance","D/E Ratio",            cb.de,     pb.de,     v=>v.toFixed(2), false),
    row("Cashflow","CFO (tỷ)",            cc.cfo, pc.cfo, vnd),
    row("Cashflow","CFI (tỷ)",            cc.cfi, pc.cfi, vnd, false),
    row("Cashflow","CFF (tỷ)",            cc.cff, pc.cff, vnd, false),
    row("Cashflow","FCF (tỷ)",            cc.cfo+cc.cfi, pc.cfo+pc.cfi, vnd),
    row("Ratio","P/E",   cr.pe,  pr.pe,  v=>v.toFixed(1), false),
    row("Ratio","P/B",   cr.pb,  pr.pb,  v=>v.toFixed(1), false),
    row("Ratio","ROE",   cr.roe, pr.roe, v=>`${v.toFixed(1)}%`),
    row("Ratio","ROA",   cr.roa, pr.roa, v=>`${v.toFixed(1)}%`),
    row("Ratio","EPS (₫)",cr.eps,pr.eps, v=>vnd(v)),
  ];
}

function exportCSV(rows:SummaryRow[], curr:string, prev:string) {
  const header=`Nhóm,Chỉ số,${curr},${prev},Δ tuyệt đối,Δ%,Xu hướng\n`;
  const body=rows.map(r=>`"${r.section}","${r.metric}","${r.curr}","${r.prev}","${r.delta}","${r.deltaPct}","${
    r.positive===null?"●":r.positive?"▲":"▼"
  }"`).join("\n");
  const blob=new Blob(["\uFEFF"+header+body],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=Object.assign(document.createElement("a"),{href:url,download:"qoq_comparison.csv"});
  a.click(); URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════

export default function FundamentalClient({ allStocks }:{ allStocks:{ticker:string;name:string}[] }) {
  const [ticker,  setTicker]  = useState(allStocks[0]?.ticker ?? "VNM");
  const [period,  setPeriod]  = useState<"quarter"|"year">("quarter");
  const [qoq,     setQoq]     = useState(true);
  const [loading, setLoading] = useState(false);

  const [rawIncome,  setRawIncome]  = useState<FinSeries|null>(null);
  const [rawBalance, setRawBalance] = useState<FinSeries|null>(null);
  const [rawCf,      setRawCf]      = useState<FinSeries|null>(null);
  const [rawRatios,  setRawRatios]  = useState<FinSeries|null>(null);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/stocks/${ticker}/income?quarters=8`).then(r=>r.json()),
      fetch(`/api/stocks/${ticker}/balance?quarters=8`).then(r=>r.json()),
      fetch(`/api/stocks/${ticker}/cashflow?quarters=8`).then(r=>r.json()),
      fetch(`/api/stocks/${ticker}/ratios?quarters=8`).then(r=>r.json()),
    ]).then(([inc,bal,cf,rat]) => {
      setRawIncome(inc); setRawBalance(bal); setRawCf(cf); setRawRatios(rat);
    }).catch(console.error)
      .finally(()=>setLoading(false));
  }, [ticker]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const incomeData  = useMemo(()=> rawIncome && rawIncome.labels?.length ? withDeltas(transformIncome(rawIncome)) : [], [rawIncome]);
  const balanceData = useMemo(()=> rawBalance && rawRatios && rawBalance.labels?.length ? transformBalance(rawBalance, rawRatios) : [], [rawBalance, rawRatios]);
  const cfData      = useMemo(()=> rawCf && rawCf.labels?.length ? transformCashflow(rawCf) : [], [rawCf]);
  const ratioData   = useMemo(()=> rawRatios && rawRatios.labels?.length ? transformRatios(rawRatios) : [], [rawRatios]);

  const fcfData = useMemo(()=> cfData.map(d=>({q:d.q, fcf:d.cfo+d.cfi})), [cfData]);

  const cfCompare = useMemo(()=>{
    if (cfData.length<2) return [];
    const idx=cfData.length-1; const curr=cfData[idx]; const prior=cfData[idx-1];
    return [
      {name:"CFO", current:curr.cfo, prior:prior.cfo},
      {name:"CFI", current:curr.cfi, prior:prior.cfi},
      {name:"CFF", current:curr.cff, prior:prior.cff},
      {name:"FCF", current:curr.cfo+curr.cfi, prior:prior.cfo+prior.cfi},
    ];
  }, [cfData]);

  const waterfallData = useMemo(()=>{
    if (!cfData.length) return [];
    const d=cfData[cfData.length-1];
    const cfo=d.cfo, cfi=d.cfi, cff=d.cff;
    const net=cfo+cfi+cff;
    const label=(v:number)=>`${v>=0?"+":""}${vnd(Math.round(Math.abs(v)))} tỷ`;
    return [
      {name:"CFO",       base:0,                             pos:Math.max(0,cfo), neg:Math.max(0,-cfo), label:label(cfo)},
      {name:"CFI",       base:Math.max(0,cfo)+Math.min(0,cfi), pos:Math.max(0,cfi), neg:Math.max(0,-cfi), label:label(cfi)},
      {name:"CFF",       base:Math.max(0,cfo)+Math.max(0,cfi)+Math.min(0,cff), pos:Math.max(0,cff), neg:Math.max(0,-cff), label:label(cff)},
      {name:"Tiền ròng", base:0,                             pos:Math.max(0,net), neg:Math.max(0,-net), label:label(net)},
    ];
  }, [cfData]);

  const donutCurr  = useMemo(()=>{
    if (!balanceData.length) return [];
    const b=balanceData[balanceData.length-1];
    return [{name:"Vốn chủ sở hữu",value:b.equity},{name:"Nợ phải trả",value:b.debt}];
  }, [balanceData]);
  const donutPrior = useMemo(()=>{
    if (balanceData.length<2) return [];
    const b=balanceData[balanceData.length-2];
    return [{name:"Vốn chủ sở hữu",value:b.equity},{name:"Nợ phải trả",value:b.debt}];
  }, [balanceData]);

  const radarData = useMemo(()=>{
    if (ratioData.length<2) return [];
    const cr=ratioData[ratioData.length-1]; const pr=ratioData[ratioData.length-2];
    const sc=(v:number,lo:number,hi:number)=>Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100));
    return [
      {metric:"P/E",   curr:sc(40-cr.pe,0,40), prior:sc(40-pr.pe,0,40)},
      {metric:"P/B",   curr:sc(15-cr.pb,0,15), prior:sc(15-pr.pb,0,15)},
      {metric:"ROE",   curr:sc(cr.roe,0,30),   prior:sc(pr.roe,0,30)},
      {metric:"ROA",   curr:sc(cr.roa,0,20),   prior:sc(pr.roa,0,20)},
      {metric:"D/E ↓", curr:sc(2-cr.de,0,2),   prior:sc(2-pr.de,0,2)},
      {metric:"EPS",   curr:sc(cr.eps,0,5000),  prior:sc(pr.eps,0,5000)},
    ];
  }, [ratioData]);

  const summary = useMemo(()=> buildSummary(incomeData, balanceData, cfData, ratioData), [incomeData, balanceData, cfData, ratioData]);

  // Indices for latest and prior
  const ni=incomeData.length-1;
  const ci=incomeData[ni]; const pi=incomeData[Math.max(0,ni-1)];
  const cb=balanceData[balanceData.length-1]; const pb=balanceData[Math.max(0,balanceData.length-2)];
  const cr=ratioData[ratioData.length-1];    const pr=ratioData[Math.max(0,ratioData.length-2)];
  const currLabel = ci?.q ?? "—"; const prevLabel = pi?.q ?? "—";
  const tickerInfo = allStocks.find(t=>t.ticker===ticker);

  const noData = !loading && !incomeData.length;

  return (
    <div className="space-y-8">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">
            {ticker}{tickerInfo?.name ? ` — ${tickerInfo.name}` : ""}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Phân tích tài chính cơ bản · {incomeData.length ? `${incomeData.length} quý gần nhất` : "—"}
          </p>
        </div>

        {/* Ticker selector */}
        <div className="relative">
          <select
            value={ticker}
            onChange={e=>setTicker(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
          >
            {allStocks.map(s=>(
              <option key={s.ticker} value={s.ticker}>{s.ticker} — {s.name}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▼</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["quarter","year"] as const).map(p=>(
            <button key={p} onClick={()=>setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period===p?"bg-emerald-600 text-white":"bg-slate-800 text-slate-400 hover:text-white"
              }`}>
              {p==="quarter"?"Quý":"Năm"}
            </button>
          ))}
          <button onClick={()=>setQoq(v=>!v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border ${
              qoq?"bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-900/40"
                 :"bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
            }`}>
            {qoq?"✓ ":""}So sánh QoQ
          </button>
        </div>
      </div>

      {/* Loading / no data */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-slate-500 text-sm animate-pulse">Đang tải dữ liệu {ticker}...</div>
      )}
      {noData && !loading && (
        <div className="flex items-center justify-center py-24 text-slate-500 text-sm">Không có dữ liệu cho {ticker}</div>
      )}

      {!loading && !!incomeData.length && (
        <>
        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 2.2  INCOME                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <h2 className={STITLE}>Kết quả kinh doanh (Income Statement)</h2>
          {ci && pi && (
            <div className="flex flex-wrap gap-3">
              <MetricCard label="Doanh thu (tỷ)"      curr={ci.revenue}     prev={pi.revenue}     format={vnd}                   qoq={qoq} />
              <MetricCard label="Lợi nhuận gộp (tỷ)"  curr={ci.grossProfit} prev={pi.grossProfit} format={vnd}                   qoq={qoq} />
              <MetricCard label="Lợi nhuận ròng (tỷ)" curr={ci.netIncome}   prev={pi.netIncome}   format={vnd}                   qoq={qoq} />
              <MetricCard label="Net Margin"           curr={ci.netMargin}   prev={pi.netMargin}   format={v=>`${v.toFixed(1)}%`} qoq={qoq} />
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue + Net Income bar */}
            <div className={CARD}>
              <p className={CTITLE}>Doanh thu &amp; Lợi nhuận ròng (tỷ VNĐ)</p>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={incomeData} margin={{top:4,right:8,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="q" tick={{fill:"#64748b",fontSize:10}} />
                  <YAxis tick={{fill:"#64748b",fontSize:10}} width={48} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TT} formatter={(v:any)=>[`${vnd(v)} tỷ`]} />
                  <Legend />
                  <Bar dataKey="revenue"   name="Doanh thu"      fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={20}>
                    {incomeData.map((_,i)=><Cell key={i} fill="#3b82f6" opacity={qoq&&i===ni?1:qoq&&i===ni-1?0.65:0.85} stroke={qoq&&i===ni?"#93c5fd":"none"} strokeWidth={qoq&&i===ni?1.5:0} />)}
                  </Bar>
                  <Bar dataKey="netIncome" name="Lợi nhuận ròng" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={20}>
                    {incomeData.map((_,i)=><Cell key={i} fill="#22c55e" opacity={qoq&&i===ni?1:qoq&&i===ni-1?0.65:0.85} stroke={qoq&&i===ni?"#86efac":"none"} strokeWidth={qoq&&i===ni?1.5:0} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Margin lines */}
            <div className={CARD}>
              <div className="flex items-start justify-between mb-4">
                <p className={CTITLE} style={{marginBottom:0}}>Biên lợi nhuận (%)</p>
                {qoq && ci && pi && (
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-400">Gross <DeltaBadge curr={ci.grossMargin} prev={pi.grossMargin} unit="pp" /></span>
                    <span className="text-amber-400">Net <DeltaBadge curr={ci.netMargin} prev={pi.netMargin} unit="pp" /></span>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={incomeData} margin={{top:4,right:8,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="q" tick={{fill:"#64748b",fontSize:10}} />
                  <YAxis tick={{fill:"#64748b",fontSize:10}} width={32} tickFormatter={v=>`${v.toFixed(0)}%`} />
                  <Tooltip contentStyle={TT} formatter={(v:any)=>[`${Number(v).toFixed(1)}%`]} />
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
        {!!balanceData.length && cb && pb && (
        <section className="space-y-4">
          <h2 className={STITLE}>Bảng cân đối kế toán (Balance Sheet)</h2>
          <div className="flex flex-wrap gap-3">
            <MetricCard label="Tổng tài sản (tỷ)"   curr={cb.totalAssets} prev={pb.totalAssets} format={vnd} qoq={qoq} />
            <MetricCard label="Vốn chủ sở hữu (tỷ)" curr={cb.equity}      prev={pb.equity}      format={vnd} qoq={qoq} />
            <MetricCard label="Nợ phải trả (tỷ)"     curr={cb.debt}        prev={pb.debt}        format={vnd} qoq={qoq} />
            <MetricCard label="D/E Ratio"             curr={cb.de}          prev={pb.de}          format={v=>v.toFixed(2)} qoq={qoq} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Donut */}
            <div className={CARD}>
              <p className={CTITLE}>{qoq?"Cơ cấu vốn: QoQ":`Cơ cấu vốn (${currLabel})`}</p>
              {qoq && donutPrior.length ? (
                <div className="flex gap-2">
                  {[{label:currLabel,data:donutCurr},{label:prevLabel,data:donutPrior}].map(({label,data})=>(
                    <div key={label} className="flex-1">
                      <p className="text-xs text-center text-slate-400 mb-1">{label}</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                            dataKey="value" label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                            {data.map((_,i)=><Cell key={i} fill={DONUT_COLORS[i]} />)}
                          </Pie>
                          <Tooltip contentStyle={TT} formatter={(v:any)=>[`${vnd(v)} tỷ`]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={donutCurr} cx="50%" cy="50%" innerRadius={55} outerRadius={82}
                      dataKey="value" label={({name,percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {donutCurr.map((_,i)=><Cell key={i} fill={DONUT_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={TT} formatter={(v:any)=>[`${vnd(v)} tỷ`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Stacked bar */}
            <div className={CARD}>
              <p className={CTITLE}>Cơ cấu nguồn vốn (tỷ VNĐ)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={balanceData} margin={{top:4,right:8,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="q" tick={{fill:"#64748b",fontSize:9}} />
                  <YAxis tick={{fill:"#64748b",fontSize:9}} width={48} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TT} formatter={(v:any)=>[`${vnd(v)} tỷ`]} />
                  <Legend />
                  <Bar dataKey="equity" name="Vốn CSH"     stackId="a" maxBarSize={24}>
                    {balanceData.map((_,i)=>{const n=balanceData.length-1; return <Cell key={i} fill="#22c55e" opacity={qoq?(i>=n-1?1:0.45):0.85} stroke={qoq&&i>=n-1?"#86efac":"none"} strokeWidth={qoq&&i>=n-1?1.5:0} />})}
                  </Bar>
                  <Bar dataKey="debt"   name="Nợ phải trả" stackId="a" maxBarSize={24} radius={[3,3,0,0]}>
                    {balanceData.map((_,i)=>{const n=balanceData.length-1; return <Cell key={i} fill="#ef4444" opacity={qoq?(i>=n-1?1:0.45):0.85} stroke={qoq&&i>=n-1?"#fca5a5":"none"} strokeWidth={qoq&&i>=n-1?1.5:0} />})}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* D/E line */}
            <div className={CARD}>
              <p className={CTITLE}>Hệ số nợ D/E</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={balanceData} margin={{top:4,right:8,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="q" tick={{fill:"#64748b",fontSize:9}} />
                  <YAxis tick={{fill:"#64748b",fontSize:9}} width={32} />
                  <Tooltip contentStyle={TT} formatter={(v:any)=>[Number(v).toFixed(2),"D/E"]} />
                  <ReferenceLine y={0.5} stroke="#f59e0b" strokeDasharray="4 2" label={{value:"0.5",fill:"#f59e0b",fontSize:9}} />
                  <Line dataKey="de" name="D/E" stroke="#f59e0b" strokeWidth={2} dot={{fill:"#f59e0b",r:3}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 2.4  CASHFLOW                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {!!cfData.length && (
        <section className="space-y-4">
          <h2 className={STITLE}>Lưu chuyển tiền tệ (Cashflow)</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Waterfall or QoQ bars */}
            <div className={CARD}>
              <p className={CTITLE}>
                {qoq?`So sánh dòng tiền: ${currLabel} vs ${prevLabel} (tỷ VNĐ)`:`Dòng tiền 3 hoạt động — ${currLabel} (tỷ VNĐ)`}
              </p>
              <ResponsiveContainer width="100%" height={230}>
                {qoq ? (
                  <BarChart data={cfCompare} margin={{top:4,right:8,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{fill:"#94a3b8",fontSize:11}} />
                    <YAxis tick={{fill:"#64748b",fontSize:10}} width={50} tickFormatter={v=>vnd(v)} />
                    <Tooltip contentStyle={TT} formatter={(v:any)=>[`${vnd(v)} tỷ`]} />
                    <Legend />
                    <Bar dataKey="current" name={currLabel} fill="#22c55e" radius={[3,3,0,0]} maxBarSize={22} />
                    <Bar dataKey="prior"   name={prevLabel} fill="#64748b" radius={[3,3,0,0]} maxBarSize={22} />
                  </BarChart>
                ) : (
                  <BarChart data={waterfallData} margin={{top:4,right:8,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{fill:"#94a3b8",fontSize:11}} />
                    <YAxis tick={{fill:"#64748b",fontSize:10}} width={48} />
                    <Tooltip contentStyle={TT} formatter={(_:any,__:any,p:any)=>[p.payload.label,""]} />
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
                <ComposedChart data={fcfData} margin={{top:4,right:8,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="q" tick={{fill:"#64748b",fontSize:10}} />
                  <YAxis tick={{fill:"#64748b",fontSize:10}} width={48} />
                  <Tooltip contentStyle={TT} formatter={(v:any)=>[`${vnd(v)} tỷ`,"FCF"]} />
                  <ReferenceLine y={0} stroke="#475569" />
                  <Bar dataKey="fcf" maxBarSize={20} radius={[3,3,0,0]}>
                    {fcfData.map((d,i)=><Cell key={i} fill={d.fcf>=0?"#22c55e88":"#ef444488"} />)}
                  </Bar>
                  <Line dataKey="fcf" stroke="#22c55e" strokeWidth={2} dot={{fill:"#22c55e",r:3}} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* QoQ CF table */}
          {qoq && cfCompare.length>0 && (
            <div className={CARD}>
              <p className={CTITLE}>So sánh QoQ — Dòng tiền</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {["Hoạt động",currLabel,prevLabel,"Δ tuyệt đối","Δ%"].map(h=>(
                        <th key={h} className="px-4 py-2 text-left text-xs text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cfCompare.map(r=>{
                      const d=r.current-r.prior; const dp=dPct(r.current,r.prior);
                      const pos=r.name==="CFI"||r.name==="CFF"?dp<0:dp>0;
                      return (
                        <tr key={r.name} className="market-row">
                          <td className="px-4 py-2.5 text-slate-300 font-medium">{r.name}</td>
                          <td className="px-4 py-2.5 font-mono text-white">{vnd(r.current)} tỷ</td>
                          <td className="px-4 py-2.5 font-mono text-slate-400">{vnd(r.prior)} tỷ</td>
                          <td className={`px-4 py-2.5 font-mono ${pos?"text-emerald-400":"text-red-400"}`}>{d>=0?"+":""}{vnd(d)} tỷ</td>
                          <td className={`px-4 py-2.5 font-semibold ${pos?"text-emerald-400":"text-red-400"}`}>{pct(dp)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 2.5  RATIOS                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {!!ratioData.length && cr && pr && (
        <section className="space-y-4">
          <h2 className={STITLE}>Chỉ số định giá &amp; Hiệu quả (Ratios)</h2>
          {/* Quick metrics table */}
          <div className={CARD}>
            <p className={CTITLE}>Chỉ số nhanh{qoq?" — So sánh QoQ":` — ${currLabel}`}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-4 py-2 text-left text-xs text-slate-500">Chỉ số</th>
                    <th className="px-4 py-2 text-right text-xs text-slate-500">{currLabel}</th>
                    {qoq&&<th className="px-4 py-2 text-right text-xs text-slate-500">{prevLabel}</th>}
                    {qoq&&<th className="px-4 py-2 text-right text-xs text-slate-500">Δ%</th>}
                    {qoq&&<th className="px-4 py-2 text-center text-xs text-slate-500">Xu hướng</th>}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {label:"P/E",  curr:cr.pe,  prev:pr.pe,  fmt:(v:number)=>`${v.toFixed(1)}x`, hb:false},
                    {label:"P/B",  curr:cr.pb,  prev:pr.pb,  fmt:(v:number)=>`${v.toFixed(1)}x`, hb:false},
                    {label:"ROE",  curr:cr.roe, prev:pr.roe, fmt:(v:number)=>`${v.toFixed(1)}%`, hb:true},
                    {label:"ROA",  curr:cr.roa, prev:pr.roa, fmt:(v:number)=>`${v.toFixed(1)}%`, hb:true},
                    {label:"D/E",  curr:cr.de,  prev:pr.de,  fmt:(v:number)=>`${v.toFixed(2)}x`, hb:false},
                    {label:"EPS",  curr:cr.eps, prev:pr.eps, fmt:(v:number)=>`${vnd(v)}₫`,       hb:true},
                  ].map(m=>{
                    const dp=dPct(m.curr,m.prev); const pos=m.hb?dp>1:dp<-1; const neutral=Math.abs(dp)<=1;
                    return (
                      <tr key={m.label} className="market-row">
                        <td className="px-4 py-2.5 text-slate-300 font-medium">{m.label}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-white">{m.fmt(m.curr)}</td>
                        {qoq&&<td className="px-4 py-2.5 text-right font-mono text-slate-400">{m.fmt(m.prev)}</td>}
                        {qoq&&<td className={`px-4 py-2.5 text-right font-semibold ${neutral?"text-slate-400":pos?"text-emerald-400":"text-red-400"}`}>{pct(dp)}</td>}
                        {qoq&&<td className={`px-4 py-2.5 text-center text-base ${neutral?"text-slate-400":pos?"text-emerald-400":"text-red-400"}`}>{neutral?"●":pos?"▲":"▼"}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Radar */}
            {radarData.length>0&&(
            <div className={CARD}>
              <p className={CTITLE}>{qoq?"Phân tích đa chiều: QoQ":"Phân tích đa chiều"}</p>
              <p className="text-xs text-slate-500 -mt-3 mb-4">Điểm chuẩn hoá (100 = tốt nhất)</p>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="metric" tick={{fill:"#94a3b8",fontSize:10}} />
                  <PolarRadiusAxis angle={90} domain={[0,100]} tick={{fill:"#475569",fontSize:8}} />
                  <Radar name={currLabel} dataKey="curr"  stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} />
                  {qoq&&<Radar name={prevLabel} dataKey="prior" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.15} />}
                  <Legend />
                  <Tooltip contentStyle={TT} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            )}
            {/* ROE/ROA bar */}
            <div className={CARD}>
              <p className={CTITLE}>{qoq?`ROE & ROA: ${currLabel} vs ${prevLabel} (%)` : "ROE & ROA theo quý (%)"}</p>
              <ResponsiveContainer width="100%" height={240}>
                {qoq?(
                  <BarChart data={[{name:"ROE",current:cr.roe,prior:pr.roe},{name:"ROA",current:cr.roa,prior:pr.roa}]}
                    margin={{top:4,right:8,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{fill:"#94a3b8",fontSize:12}} />
                    <YAxis tick={{fill:"#64748b",fontSize:10}} width={32} tickFormatter={v=>`${v}%`} />
                    <Tooltip contentStyle={TT} formatter={(v:any)=>[`${Number(v).toFixed(1)}%`]} />
                    <Legend />
                    <Bar dataKey="current" name={currLabel} fill="#22c55e" radius={[3,3,0,0]} maxBarSize={32} />
                    <Bar dataKey="prior"   name={prevLabel} fill="#64748b" radius={[3,3,0,0]} maxBarSize={32} />
                  </BarChart>
                ):(
                  <BarChart data={ratioData} margin={{top:4,right:8,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="q" tick={{fill:"#64748b",fontSize:9}} />
                    <YAxis tick={{fill:"#64748b",fontSize:9}} width={32} tickFormatter={v=>`${v}%`} />
                    <Tooltip contentStyle={TT} formatter={(v:any)=>[`${Number(v).toFixed(1)}%`]} />
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
                <ComposedChart data={ratioData} margin={{top:4,right:8,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="q" tick={{fill:"#64748b",fontSize:9}} />
                  <YAxis tick={{fill:"#64748b",fontSize:9}} width={48} tickFormatter={v=>vnd(v)} />
                  <Tooltip contentStyle={TT} formatter={(v:any)=>[`${vnd(v)}₫`,"EPS"]} />
                  <Bar dataKey="eps" fill="#a78bfa44" maxBarSize={22} radius={[3,3,0,0]} />
                  <Line dataKey="eps" stroke="#a78bfa" strokeWidth={2} dot={{fill:"#a78bfa",r:3}} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 2.6  QoQ SUMMARY TABLE                                           */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {qoq && summary.length>0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className={STITLE} style={{marginBottom:0}}>Bảng tổng hợp so sánh QoQ — Tất cả chỉ số</h2>
              <button onClick={()=>exportCSV(summary, currLabel, prevLabel)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors">
                ↓ Xuất CSV
              </button>
            </div>
            <div className={`${CARD} overflow-hidden p-0`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/50">
                      {["Nhóm","Chỉ số",currLabel,prevLabel,"Δ tuyệt đối","Δ%","Xu hướng"].map(h=>(
                        <th key={h} className="px-4 py-3 text-left text-xs text-slate-400 font-semibold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row,i)=>{
                      const prev=summary[i-1]; const showSection=!prev||prev.section!==row.section;
                      return (
                        <tr key={i} className="market-row">
                          <td className="px-4 py-2.5">
                            {showSection?(
                              <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{row.section}</span>
                            ):null}
                          </td>
                          <td className="px-4 py-2.5 text-slate-300 font-medium">{row.metric}</td>
                          <td className="px-4 py-2.5 font-mono text-white text-right">{row.curr}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-400 text-right">{row.prev}</td>
                          <td className={`px-4 py-2.5 font-mono text-right ${row.positive===null?"text-slate-400":row.positive?"text-emerald-400":"text-red-400"}`}>{row.delta}</td>
                          <td className={`px-4 py-2.5 font-semibold text-right ${row.positive===null?"text-slate-400":row.positive?"text-emerald-400":"text-red-400"}`}>{row.deltaPct}</td>
                          <td className={`px-4 py-2.5 text-center text-base ${row.positive===null?"text-slate-400":row.positive?"text-emerald-400":"text-red-400"}`}>
                            {row.positive===null?"●":row.positive?"▲":"▼"}
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
        </>
      )}
    </div>
  );
}
