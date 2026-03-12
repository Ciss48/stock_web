"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { StockOverview } from "@/lib/api";
import { fmt, fmtVol, pctSign, pctClass } from "@/lib/utils";

type SortKey = "ticker" | "close" | "change_pct" | "volume";

export default function MarketTableClient({ stocks }: { stocks: StockOverview[] }) {
  const [sort, setSort]   = useState<SortKey>("change_pct");
  const [asc,  setAsc]    = useState(false);
  const [filter, setFilter] = useState("");

  const sorted = useMemo(() => {
    let rows = stocks.filter(s =>
      !filter || s.ticker.includes(filter.toUpperCase()) || s.name.toLowerCase().includes(filter.toLowerCase())
    );
    rows = [...rows].sort((a, b) => {
      const va = a[sort] ?? 0, vb = b[sort] ?? 0;
      return asc
        ? (va < vb ? -1 : va > vb ? 1 : 0)
        : (va > vb ? -1 : va < vb ? 1 : 0);
    });
    return rows;
  }, [stocks, sort, asc, filter]);

  function toggle(key: SortKey) {
    if (sort === key) setAsc(p => !p);
    else { setSort(key); setAsc(false); }
  }

  const Th = ({ k, label, cls = "" }: { k: SortKey; label: string; cls?: string }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors ${cls}`}
      onClick={() => toggle(k)}
    >
      {label} {sort === k ? (asc ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-800">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Tìm theo mã hoặc tên..."
          className="bg-slate-800 text-sm text-white placeholder-slate-500 rounded-lg px-3 py-2 w-64 outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              <Th k="ticker"     label="Mã"        />
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tên</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Ngành</th>
              <Th k="close"      label="Giá"       cls="text-right" />
              <Th k="change_pct" label="% Thay đổi" cls="text-right" />
              <Th k="volume"     label="KL"        cls="text-right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => (
              <tr key={s.ticker} className="market-row">
                <td className="px-4 py-3">
                  <Link
                    href={`/stocks/${s.ticker}`}
                    className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {s.ticker}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate">{s.name}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{s.sector}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-white font-medium">{fmt(s.close)}</td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${pctClass(s.change_pct)}`}>
                  {pctSign(s.change_pct)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-400">{fmtVol(s.volume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
