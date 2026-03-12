"use client";
import { useEffect, useRef } from "react";
import type { PriceHistory } from "@/lib/api";

interface Props { data: PriceHistory }

export default function CandlestickChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data.candles.length) return;

    let cleanup: (() => void) | undefined;

    import("lightweight-charts").then((lc) => {
      if (!containerRef.current) return;

      const chart = lc.createChart(containerRef.current, {
        width:  containerRef.current.clientWidth,
        height: 380,
        layout: {
          background: { color: "#0f172a" },
          textColor:  "#64748b",
        },
        grid: {
          vertLines: { color: "#1e293b" },
          horzLines: { color: "#1e293b" },
        },
        crosshair: { mode: lc.CrosshairMode.Normal },
        rightPriceScale: { borderColor: "#1e293b" },
        timeScale: {
          borderColor:    "#1e293b",
          timeVisible:    true,
          secondsVisible: false,
        },
      });

      // lightweight-charts v5 API: addSeries(SeriesClass, options)
      const candleSeries = chart.addSeries(lc.CandlestickSeries, {
        upColor:         "#22c55e",
        downColor:       "#ef4444",
        borderUpColor:   "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor:     "#22c55e",
        wickDownColor:   "#ef4444",
      });
      candleSeries.setData(data.candles as any);

      const volumeSeries = chart.addSeries(lc.HistogramSeries, {
        priceFormat:  { type: "volume" as const },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });
      volumeSeries.setData(data.volumes as any);

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      ro.observe(containerRef.current);

      cleanup = () => { ro.disconnect(); chart.remove(); };
    });

    return () => { cleanup?.(); };
  }, [data]);

  return <div ref={containerRef} className="w-full rounded-lg overflow-hidden" style={{ height: 380 }} />;
}
