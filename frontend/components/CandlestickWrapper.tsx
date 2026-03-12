"use client";
import dynamic from "next/dynamic";
import type { PriceHistory } from "@/lib/api";

const CandlestickChart = dynamic(() => import("./CandlestickChart"), { ssr: false });

export default function CandlestickWrapper({ data }: { data: PriceHistory }) {
  if (!data?.candles?.length) {
    return <div className="h-96 flex items-center justify-center text-slate-500">Không có dữ liệu giá</div>;
  }
  return <CandlestickChart data={data} />;
}
