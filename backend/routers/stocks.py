"""
Stock-level endpoints:
  GET /api/stocks                        - danh sách tất cả cổ phiếu
  GET /api/stocks/{ticker}               - thông tin + giá mới nhất
  GET /api/stocks/{ticker}/prices        - OHLCV history (chart-ready)
  GET /api/stocks/{ticker}/income        - income statement theo quý
  GET /api/stocks/{ticker}/balance       - balance sheet theo quý
  GET /api/stocks/{ticker}/cashflow      - cash flow theo quý
  GET /api/stocks/{ticker}/ratios        - financial ratios theo quý
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import date, timedelta
from typing import Optional
import db

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


def _period_label(year: int, quarter: int) -> str:
    return f"Q{quarter}/{str(year)[-2:]}"


# ── List all stocks ───────────────────────────────────────────────────────────

@router.get("")
async def list_stocks():
    rows = await db.select("companies", select="ticker,name,exchange,sectors(name)")
    return {
        "data": [
            {
                "ticker":   r["ticker"],
                "name":     r["name"],
                "exchange": r["exchange"],
                "sector":   r["sectors"]["name"] if r.get("sectors") else None,
            }
            for r in rows
        ]
    }


# ── Stock detail ──────────────────────────────────────────────────────────────

@router.get("/{ticker}")
async def stock_detail(ticker: str):
    ticker = ticker.upper()
    companies = await db.select("companies", select="ticker,name,exchange,sectors(name)", ticker=f"eq.{ticker}")
    if not companies:
        raise HTTPException(404, f"Không tìm thấy mã {ticker}")
    c = companies[0]

    prices = await db.select(
        "price_history",
        select="date,open,high,low,close,volume",
        ticker=f"eq.{ticker}",
        order="date.desc",
        limit=2,
    )
    latest = prices[0] if prices else {}
    prev   = prices[1] if len(prices) > 1 else None

    prev_close = prev["close"] if prev else latest.get("open")
    change     = round(latest["close"] - prev_close, 2) if prev_close and latest.get("close") else 0
    change_pct = round(change / prev_close * 100, 2) if prev_close else 0

    # Lấy ratio mới nhất
    ratios = await db.select(
        "financial_ratios",
        select="year,quarter,pe,pb,roe,roa,eps",
        ticker=f"eq.{ticker}",
        order="year.desc,quarter.desc",
        limit=1,
    )
    latest_ratio = ratios[0] if ratios else {}

    return {
        "ticker":     ticker,
        "name":       c["name"],
        "exchange":   c["exchange"],
        "sector":     c["sectors"]["name"] if c.get("sectors") else None,
        "price": {
            **latest,
            "change":     change,
            "change_pct": change_pct,
        },
        "ratios": {
            "pe":      latest_ratio.get("pe"),
            "pb":      latest_ratio.get("pb"),
            "roe":     latest_ratio.get("roe"),
            "roa":     latest_ratio.get("roa"),
            "eps":     latest_ratio.get("eps"),
            "period":  _period_label(latest_ratio["year"], latest_ratio["quarter"]) if latest_ratio else None,
        },
    }


# ── Price history ─────────────────────────────────────────────────────────────

@router.get("/{ticker}/prices")
async def price_history(
    ticker: str,
    start:  Optional[str] = Query(None, description="YYYY-MM-DD, mặc định 1 năm gần nhất"),
    end:    Optional[str] = Query(None, description="YYYY-MM-DD, mặc định hôm nay"),
):
    ticker = ticker.upper()
    if not end:
        end = date.today().isoformat()
    if not start:
        start = (date.today() - timedelta(days=365)).isoformat()

    rows = await db.select(
        "price_history",
        select="date,open,high,low,close,volume",
        ticker=f"eq.{ticker}",
        date=f"gte.{start}",
        order="date.asc",
    )
    # Lọc thêm end date (Supabase REST API dùng `date=lte.end` nhưng
    # params dict không nhận 2 key trùng → filter trong Python)
    rows = [r for r in rows if r["date"] <= end]

    # Format cho TradingView Lightweight Charts
    candles = [
        {"time": r["date"], "open": r["open"], "high": r["high"],
         "low": r["low"], "close": r["close"]}
        for r in rows
    ]
    volumes = [
        {
            "time":  r["date"],
            "value": r["volume"],
            "color": "rgba(38,166,154,0.5)" if r["close"] >= r["open"] else "rgba(239,83,80,0.5)",
        }
        for r in rows
    ]
    return {"ticker": ticker, "start": start, "end": end, "candles": candles, "volumes": volumes}


# ── Income Statement ──────────────────────────────────────────────────────────

@router.get("/{ticker}/income")
async def income_statement(ticker: str, quarters: int = Query(12, ge=4, le=40)):
    ticker = ticker.upper()
    rows = await db.select(
        "income_statement",
        select="year,quarter,revenue,gross_profit,operating_profit,net_profit",
        ticker=f"eq.{ticker}",
        order="year.asc,quarter.asc",
        limit=quarters,
    )
    if not rows:
        raise HTTPException(404, f"Không có dữ liệu income cho {ticker}")

    # Sort đúng thứ tự thời gian rồi lấy `quarters` cuối
    rows = sorted(rows, key=lambda r: (r["year"], r["quarter"]))[-quarters:]

    labels  = [_period_label(r["year"], r["quarter"]) for r in rows]
    billion = 1_000_000_000  # vnstock trả VND nguyên, chia ra tỷ cho đẹp

    def _b(v): return round(v / billion, 2) if v is not None else None

    return {
        "ticker":  ticker,
        "labels":  labels,
        "series": {
            "revenue":          [_b(r["revenue"])          for r in rows],
            "gross_profit":     [_b(r["gross_profit"])     for r in rows],
            "operating_profit": [_b(r["operating_profit"]) for r in rows],
            "net_profit":       [_b(r["net_profit"])       for r in rows],
        },
        "unit": "tỷ VND",
    }


# ── Balance Sheet ─────────────────────────────────────────────────────────────

@router.get("/{ticker}/balance")
async def balance_sheet(ticker: str, quarters: int = Query(12, ge=4, le=40)):
    ticker = ticker.upper()
    rows = await db.select(
        "balance_sheet",
        select="year,quarter,total_assets,total_liabilities,total_equity,cash",
        ticker=f"eq.{ticker}",
        order="year.asc,quarter.asc",
        limit=quarters,
    )
    if not rows:
        raise HTTPException(404, f"Không có dữ liệu balance cho {ticker}")

    rows = sorted(rows, key=lambda r: (r["year"], r["quarter"]))[-quarters:]
    labels  = [_period_label(r["year"], r["quarter"]) for r in rows]
    billion = 1_000_000_000

    def _b(v): return round(v / billion, 2) if v is not None else None

    return {
        "ticker": ticker,
        "labels": labels,
        "series": {
            "total_assets":     [_b(r["total_assets"])     for r in rows],
            "total_liabilities":[_b(r["total_liabilities"]) for r in rows],
            "total_equity":     [_b(r["total_equity"])     for r in rows],
            "cash":             [_b(r["cash"])             for r in rows],
        },
        "unit": "tỷ VND",
    }


# ── Cash Flow ─────────────────────────────────────────────────────────────────

@router.get("/{ticker}/cashflow")
async def cash_flow(ticker: str, quarters: int = Query(12, ge=4, le=40)):
    ticker = ticker.upper()
    rows = await db.select(
        "cash_flow",
        select="year,quarter,operating_cf,investing_cf,financing_cf",
        ticker=f"eq.{ticker}",
        order="year.asc,quarter.asc",
        limit=quarters,
    )
    if not rows:
        raise HTTPException(404, f"Không có dữ liệu cashflow cho {ticker}")

    rows = sorted(rows, key=lambda r: (r["year"], r["quarter"]))[-quarters:]
    labels  = [_period_label(r["year"], r["quarter"]) for r in rows]
    billion = 1_000_000_000

    def _b(v): return round(v / billion, 2) if v is not None else None

    return {
        "ticker": ticker,
        "labels": labels,
        "series": {
            "operating_cf": [_b(r["operating_cf"]) for r in rows],
            "investing_cf": [_b(r["investing_cf"]) for r in rows],
            "financing_cf": [_b(r["financing_cf"]) for r in rows],
        },
        "unit": "tỷ VND",
    }


# ── Financial Ratios ──────────────────────────────────────────────────────────

@router.get("/{ticker}/ratios")
async def financial_ratios(ticker: str, quarters: int = Query(12, ge=4, le=40)):
    ticker = ticker.upper()
    rows = await db.select(
        "financial_ratios",
        select="year,quarter,pe,pb,roe,roa,eps,debt_to_equity,current_ratio",
        ticker=f"eq.{ticker}",
        order="year.asc,quarter.asc",
        limit=quarters,
    )
    if not rows:
        raise HTTPException(404, f"Không có dữ liệu ratios cho {ticker}")

    rows = sorted(rows, key=lambda r: (r["year"], r["quarter"]))[-quarters:]
    labels = [_period_label(r["year"], r["quarter"]) for r in rows]

    def _r(v, n=2): return round(v, n) if v is not None else None

    return {
        "ticker": ticker,
        "labels": labels,
        "series": {
            "pe":             [_r(r["pe"])             for r in rows],
            "pb":             [_r(r["pb"])             for r in rows],
            "roe":            [_r(r["roe"], 4)         for r in rows],
            "roa":            [_r(r["roa"], 4)         for r in rows],
            "eps":            [_r(r["eps"], 0)         for r in rows],
            "debt_to_equity": [_r(r["debt_to_equity"]) for r in rows],
            "current_ratio":  [_r(r["current_ratio"]) for r in rows],
        },
    }
