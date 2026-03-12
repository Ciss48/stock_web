import { api, SectorSummary } from "@/lib/api";
import { pctSign } from "@/lib/utils";
import MarketTableClient from "@/components/MarketTableClient";

export const revalidate = 60;

export default async function OverviewPage() {
  const [overviewRes, sectorsRes] = await Promise.all([
    api.marketOverview().catch(() => ({ data: [], total: 0 })),
    api.marketSectors().catch(() => ({ data: [] })),
  ]);

  const stocks  = overviewRes.data;
  const sectors = sectorsRes.data;
  const up      = stocks.filter(s => s.change_pct > 0).length;
  const down    = stocks.filter(s => s.change_pct < 0).length;
  const flat    = stocks.length - up - down;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tổng quan thị trường</h1>
        <p className="text-slate-500 text-sm mt-1">
          {stocks[0]?.date ?? "—"} · {stocks.length} mã theo dõi
        </p>
      </div>

      {/* Breadth */}
      <div className="flex gap-3">
        {[
          { label: "Tăng",  value: up,   color: "text-emerald-400 border-emerald-900 bg-emerald-950/30" },
          { label: "Giảm",  value: down, color: "text-red-400 border-red-900 bg-red-950/30"             },
          { label: "Đứng",  value: flat, color: "text-slate-400 border-slate-700 bg-slate-800/30"       },
        ].map(c => (
          <div key={c.label} className={`rounded-lg px-5 py-3 border ${c.color} min-w-[80px] text-center`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs opacity-70 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Sector cards */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Nhóm ngành</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sectors.map(s => <SectorCard key={s.sector} s={s} />)}
        </div>
      </div>

      {/* Market table */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Danh sách cổ phiếu</h2>
        <MarketTableClient stocks={stocks} />
      </div>
    </div>
  );
}

function SectorCard({ s }: { s: SectorSummary }) {
  const pos = s.avg_change_pct >= 0;
  return (
    <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 hover:border-slate-600 transition-colors">
      <div className="text-xs text-slate-400 mb-2 truncate font-medium">{s.sector}</div>
      <div className={`text-xl font-bold ${pos ? "text-emerald-400" : "text-red-400"}`}>
        {pctSign(s.avg_change_pct)}
      </div>
      <div className="mt-2.5 flex gap-3 text-xs">
        <span className="text-emerald-400">{s.up} tăng</span>
        <span className="text-red-400">{s.down} giảm</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${pos ? "bg-emerald-500" : "bg-red-500"}`}
          style={{ width: `${Math.min(100, Math.abs(s.avg_change_pct) * 14)}%` }}
        />
      </div>
    </div>
  );
}
