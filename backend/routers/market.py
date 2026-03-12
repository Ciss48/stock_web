"""
Market-level endpoints:
  GET /api/market/overview   - tất cả mã: giá mới nhất, % thay đổi, volume
  GET /api/market/sectors    - hiệu suất từng nhóm ngành
"""

from fastapi import APIRouter, HTTPException
from datetime import date, timedelta
import asyncio
import db

router = APIRouter(prefix="/api/market", tags=["market"])


async def _latest_two(ticker: str) -> list[dict]:
    """Lấy 2 ngày giá gần nhất của 1 ticker."""
    rows = await db.select(
        "price_history",
        select="date,open,high,low,close,volume",
        ticker=f"eq.{ticker}",
        order="date.desc",
        limit=2,
    )
    return rows


@router.get("/overview")
async def market_overview():
    """
    Trả về danh sách tất cả cổ phiếu với:
    - Giá đóng cửa mới nhất
    - Thay đổi so với hôm trước (VND và %)
    - Volume
    - Thông tin công ty và nhóm ngành
    """
    # Lấy danh sách công ty + sector
    companies = await db.select(
        "companies",
        select="ticker,name,exchange,sectors(name)",
    )
    company_map = {
        c["ticker"]: {
            "name":    c["name"],
            "exchange": c["exchange"],
            "sector":  c["sectors"]["name"] if c.get("sectors") else None,
        }
        for c in companies
    }

    # Lấy giá 2 ngày gần nhất cho tất cả tickers song song
    tickers = list(company_map.keys())
    results = await asyncio.gather(*[_latest_two(t) for t in tickers])

    overview = []
    for ticker, rows in zip(tickers, results):
        if not rows:
            continue
        today = rows[0]
        prev  = rows[1] if len(rows) > 1 else None

        prev_close = prev["close"] if prev else today["open"]
        change     = round(today["close"] - prev_close, 2) if prev_close else 0
        change_pct = round(change / prev_close * 100, 2) if prev_close else 0

        overview.append({
            "ticker":     ticker,
            **company_map.get(ticker, {}),
            "date":       today["date"],
            "open":       today["open"],
            "high":       today["high"],
            "low":        today["low"],
            "close":      today["close"],
            "volume":     today["volume"],
            "change":     change,
            "change_pct": change_pct,
        })

    # Sort: giảm dần theo % thay đổi
    overview.sort(key=lambda x: x["change_pct"], reverse=True)
    return {"data": overview, "total": len(overview)}


@router.get("/sectors")
async def sector_performance():
    """
    Hiệu suất từng nhóm ngành:
    - Tổng số mã
    - % tăng trung bình
    - Số mã tăng / giảm
    """
    overview_resp = await market_overview()
    stocks = overview_resp["data"]

    sectors: dict[str, dict] = {}
    for s in stocks:
        sec = s.get("sector") or "Khác"
        if sec not in sectors:
            sectors[sec] = {"sector": sec, "tickers": [], "total_change_pct": 0, "up": 0, "down": 0, "flat": 0}
        sectors[sec]["tickers"].append(s["ticker"])
        sectors[sec]["total_change_pct"] += s["change_pct"]
        if s["change_pct"] > 0:
            sectors[sec]["up"] += 1
        elif s["change_pct"] < 0:
            sectors[sec]["down"] += 1
        else:
            sectors[sec]["flat"] += 1

    result = []
    for sec, d in sectors.items():
        n = len(d["tickers"])
        result.append({
            "sector":     sec,
            "count":      n,
            "avg_change_pct": round(d["total_change_pct"] / n, 2) if n else 0,
            "up":         d["up"],
            "down":       d["down"],
            "flat":       d["flat"],
            "tickers":    d["tickers"],
        })

    result.sort(key=lambda x: x["avg_change_pct"], reverse=True)
    return {"data": result}
