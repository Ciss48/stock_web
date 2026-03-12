"use client";
import { useState, useEffect } from "react";
import { api, FinancialSeries } from "@/lib/api";
import { IncomeChart, BalanceChart, CashflowChart, RatiosChart } from "./FinancialCharts";

type Tab = "income" | "balance" | "cashflow" | "ratios";

const TABS: { key: Tab; label: string }[] = [
  { key: "income",   label: "Kết quả KD"   },
  { key: "balance",  label: "Cân đối KT"   },
  { key: "cashflow", label: "Lưu chuyển TT" },
  { key: "ratios",   label: "Chỉ số"        },
];

export default function StockTabs({ ticker }: { ticker: string }) {
  const [tab,  setTab]  = useState<Tab>("income");
  const [data, setData] = useState<FinancialSeries | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    setData(null);

    const fetchers: Record<Tab, () => Promise<FinancialSeries>> = {
      income:   () => api.income(ticker),
      balance:  () => api.balance(ticker),
      cashflow: () => api.cashflow(ticker),
      ratios:   () => api.ratios(ticker),
    };

    fetchers[tab]()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab, ticker]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800">
      {/* Tab headers */}
      <div className="flex border-b border-slate-800 px-4 pt-3">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg mr-1 transition-colors ${
              tab === t.key
                ? "bg-slate-800 text-white border border-b-0 border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="p-4 min-h-[350px]">
        {loading && (
          <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
            Đang tải dữ liệu...
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-64 text-red-400 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && data && (
          <>
            {tab === "income"   && <IncomeChart   data={data} />}
            {tab === "balance"  && <BalanceChart  data={data} />}
            {tab === "cashflow" && <CashflowChart data={data} />}
            {tab === "ratios"   && <RatiosChart   data={data} />}
          </>
        )}
      </div>
    </div>
  );
}
