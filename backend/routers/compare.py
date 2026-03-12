"""
Comparison endpoints:
  GET /api/compare/prices?tickers=VCB,CTG,BID   - normalized price (base=100)
  GET /api/compare/ratios?tickers=VCB,CTG,BID   - bảng so sánh chỉ số mới nhất
"""

from fastapi import APIRouter, Query, HTTPException
from datetime import date, timedelta
from typing import Optional
import asyncio
import db

router = APIRouter(prefix="/api/compare", tags=["compare"])


@router.get("/prices")
async def compare_prices(
    tickers: str = Query(..., description="Danh sách mã cách nhau dấu phẩy, vd: VCB,CTG,BID"),
    start:   Optional[str] = Query(None, description="YYYY-MM-DD"),
    end:     Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    """
    Trả về giá normalized (base = 100 tại ngày đầu tiên) để so sánh xu hướng
    nhiều cổ phiếu trên cùng một chart.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if len(ticker_list) < 2:
        raise HTTPException(400, "Cần ít nhất 2 tickers để so sánh")
    if len(ticker_list) > 6:
        raise HTTPException(400, "Tối đa 6 tickers cùng lúc")

    if not end:
        end = date.today().isoformat()
    if not start:
        start = (date.today() - timedelta(days=365)).isoformat()

    async def fetch_one(ticker: str):
        rows = await db.select(
            "price_history",
            select="date,close",
            ticker=f"eq.{ticker}",
            date=f"gte.{start}",
            order="date.asc",
        )
        rows = [r for r in rows if r["date"] <= end]
        return ticker, rows

    all_results = await asyncio.gather(*[fetch_one(t) for t in ticker_list])

    # Normalize: base = 100 tại ngày đầu tiên có data
    series = {}
    all_dates = set()
    for ticker, rows in all_results:
        if not rows:
            continue
        base = rows[0]["close"]
        if not base:
            continue
        series[ticker] = {r["date"]: round(r["close"] / base * 100, 2) for r in rows}
        all_dates.update(series[ticker].keys())

    sorted_dates = sorted(all_dates)
    return {
        "start":   start,
        "end":     end,
        "dates":   sorted_dates,
        "series":  {
            ticker: [series[ticker].get(d) for d in sorted_dates]
            for ticker in series
        },
    }


@router.get("/ratios")
async def compare_ratios(
    tickers: str = Query(..., description="Danh sách mã cách nhau dấu phẩy"),
):
    """
    Bảng so sánh chỉ số tài chính mới nhất của nhiều cổ phiếu side-by-side.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        raise HTTPException(400, "Cần ít nhất 1 ticker")

    async def fetch_one(ticker: str):
        rows = await db.select(
            "financial_ratios",
            select="year,quarter,pe,pb,roe,roa,eps,debt_to_equity",
            ticker=f"eq.{ticker}",
            order="year.desc,quarter.desc",
            limit=1,
        )
        return ticker, rows[0] if rows else {}

    results = await asyncio.gather(*[fetch_one(t) for t in ticker_list])

    def _r(v, n=2): return round(v, n) if v is not None else None

    metrics = ["pe", "pb", "roe", "roa", "eps", "debt_to_equity"]
    comparison = []
    for metric in metrics:
        row = {"metric": metric}
        for ticker, data in results:
            row[ticker] = _r(data.get(metric))
        comparison.append(row)

    return {
        "tickers":    [t for t, _ in results],
        "periods":    {t: f"Q{d['quarter']}/{str(d['year'])[-2:]}" if d else None for t, d in results},
        "comparison": comparison,
    }
