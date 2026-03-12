import { api } from "@/lib/api";
import { fmt, fmtVol, pctSign, pctClass, daysAgo } from "@/lib/utils";
import { notFound } from "next/navigation";
import CandlestickWrapper from "@/components/CandlestickWrapper";
import StockTabs from "@/components/StockTabs";

export const revalidate = 60;

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const t = ticker.toUpperCase();

  const [info, prices] = await Promise.all([
    api.stock(t).catch(() => null),
    api.prices(t, daysAgo(365)).catch(() => null),
  ]);

  if (!info) notFound();

  const { price, ratios } = info;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-white">{t}</h1>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">
              {info.exchange}
            </span>
          </div>
          <p className="text-slate-400 text-lg">{info.name}</p>
          <p className="text-xs text-slate-600 mt-1">{info.sector}</p>
        </div>

        <div className="md:ml-auto flex flex-wrap gap-6">
          {/* Price */}
          <div>
            <div className="text-3xl font-bold font-mono text-white">{fmt(price.close)}</div>
            <div className={`text-sm font-semibold mt-1 ${pctClass(price.change_pct)}`}>
              {price.change > 0 ? "+" : ""}{fmt(price.change)} ({pctSign(price.change_pct)})
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{price.date}</div>
          </div>

          {/* OHLV */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            {[
              ["Mở cửa",    fmt(price.open)],
              ["Cao nhất",  fmt(price.high)],
              ["Thấp nhất", fmt(price.low)],
              ["KL giao dịch", fmtVol(price.volume)],
            ].map(([k, v]) => (
              <div key={k}>
                <span className="text-slate-500">{k}: </span>
                <span className="text-white font-mono">{v}</span>
              </div>
            ))}
          </div>

          {/* Key ratios */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            {[
              ["P/E",  ratios.pe   != null ? fmt(ratios.pe, 2)   : "—"],
              ["P/B",  ratios.pb   != null ? fmt(ratios.pb, 2)   : "—"],
              ["ROE",  ratios.roe  != null ? `${(ratios.roe * 100).toFixed(1)}%` : "—"],
              ["EPS",  ratios.eps  != null ? fmt(ratios.eps, 0)  : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <span className="text-slate-500">{k}: </span>
                <span className="text-white font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Candlestick chart */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        {prices
          ? <CandlestickWrapper data={prices} />
          : <div className="h-96 flex items-center justify-center text-slate-500">Không có dữ liệu giá</div>
        }
      </div>

      {/* Financial tabs */}
      <StockTabs ticker={t} />
    </div>
  );
}
