"""
ETL Script: Crawl dữ liệu chứng khoán VN bằng vnstock → Supabase REST API
Dùng requests (HTTPS) qua proxy FPT — không cần psycopg2/supabase-py.

Chạy:
  python etl.py                          # toàn bộ tickers, all data
  python etl.py --mode prices            # chỉ giá
  python etl.py --mode financials        # chỉ tài chính
  python etl.py --ticker VCB             # 1 mã, all data
"""

import os, sys
os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv
load_dotenv()

# Cấu hình proxy TRƯỚC khi import requests
PROXY = os.getenv("HTTP_PROXY") or os.getenv("HTTPS_PROXY")
PROXIES = {"http": PROXY, "https": PROXY} if PROXY else None

import time, argparse, math, re
import pandas as pd
import requests
from datetime import date

# ─── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates",   # upsert
}
CHUNK_SIZE = 400

TICKERS = [
    "VCB", "CTG", "BID", "VPB", "TCB", "MBB", "HDB", "STB",
    "VHM", "VIC", "NVL", "KDH", "DXG",
    "VNM", "HPG", "MSN", "SAB", "PNJ",
    "FPT", "VGI",
]

PRICE_START = "2020-01-01"
PRICE_END   = date.today().strftime("%Y-%m-%d")

# ─── REST API helpers ─────────────────────────────────────────────────────────

def rest_upsert(table: str, records: list[dict]) -> int:
    """POST /rest/v1/{table} với Prefer: merge-duplicates (upsert)."""
    if not records:
        return 0
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    total = 0
    for i in range(0, len(records), CHUNK_SIZE):
        chunk = records[i:i + CHUNK_SIZE]
        resp = requests.post(url, json=chunk, headers=HEADERS,
                             proxies=PROXIES, timeout=30, verify=True)
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
        total += len(chunk)
    return total

def rest_select(table: str, select: str = "*") -> list[dict]:
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}"
    resp = requests.get(url, headers=HEADERS, proxies=PROXIES, timeout=15, verify=True)
    resp.raise_for_status()
    return resp.json()

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _f(val):
    try:
        if val is None: return None
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (ValueError, TypeError):
        return None

def _find(cols, keywords):
    for kw in keywords:
        c = next((c for c in cols if kw.lower() in c.lower()), None)
        if c: return c
    return None

# ─── vnstock rate-limit aware fetch ──────────────────────────────────────────

def _vnstock_fetch(fn, *args, **kwargs):
    """Gọi fn(*args, **kwargs), tự retry nếu bị rate limit.
    vnstock gọi sys.exit() khi rate limit → phải catch SystemExit (BaseException)."""
    while True:
        try:
            return fn(*args, **kwargs)
        except SystemExit:
            # vnstock gọi sys.exit() khi rate limit → chờ 65s rồi retry
            print("    [rate-limit] Bị giới hạn API, chờ 65s rồi retry...")
            time.sleep(65)
        except Exception as e:
            msg = str(e)
            if "rate limit" in msg.lower() or "giới hạn" in msg.lower():
                m = re.search(r'(\d+)\s*(giây|second|s\b)', msg, re.IGNORECASE)
                wait = int(m.group(1)) + 5 if m else 65
                print(f"    [rate-limit] Chờ {wait}s rồi retry...")
                time.sleep(wait)
            else:
                raise

# ─── ETL functions ────────────────────────────────────────────────────────────

def etl_prices(ticker: str):
    from vnstock import Vnstock
    s = Vnstock().stock(symbol=ticker, source="VCI")
    df = _vnstock_fetch(s.quote.history, start=PRICE_START, end=PRICE_END, interval="1D")
    df["date"] = pd.to_datetime(df["time"]).dt.strftime("%Y-%m-%d")
    records = [{"ticker": ticker, "date": r["date"],
                "open": _f(r["open"]), "high": _f(r["high"]),
                "low":  _f(r["low"]),  "close": _f(r["close"]),
                "volume": int(r["volume"])}
               for _, r in df.iterrows()]
    n = rest_upsert("price_history", records)
    print(f"    price_history       : {n} rows")


def etl_income(ticker: str):
    from vnstock import Vnstock
    s  = Vnstock().stock(symbol=ticker, source="VCI")
    df = _vnstock_fetch(s.finance.income_statement, period="quarter", lang="en")
    cols = df.columns.tolist()
    rev = _find(cols, ["Revenue (Bn. VND)", "revenue"])
    gp  = _find(cols, ["gross profit"])
    op  = _find(cols, ["operating profit before", "operating profit", "total operating revenue"])
    np_ = _find(cols, ["net profit for the year", "net profit", "posttax"])
    records = []
    for _, r in df.iterrows():
        try:
            records.append({"ticker": ticker, "year": int(r["yearReport"]), "quarter": int(r["lengthReport"]),
                            "revenue": _f(r[rev]) if rev else None, "gross_profit": _f(r[gp]) if gp else None,
                            "operating_profit": _f(r[op]) if op else None, "net_profit": _f(r[np_]) if np_ else None})
        except Exception: pass
    n = rest_upsert("income_statement", records)
    print(f"    income_statement    : {n} rows")


def etl_balance(ticker: str):
    from vnstock import Vnstock
    s  = Vnstock().stock(symbol=ticker, source="VCI")
    df = _vnstock_fetch(s.finance.balance_sheet, period="quarter", lang="en")
    cols = df.columns.tolist()
    a   = _find(cols, ["TOTAL ASSETS"])
    li  = _find(cols, ["LIABILITIES (Bn"])
    eq  = _find(cols, ["OWNER'S EQUITY", "owners equity"])
    ca  = _find(cols, ["Cash and cash equivalents"])
    std = _find(cols, ["Short-term debt", "Short debt"])
    ltd = _find(cols, ["Long-term debt", "Long debt"])
    records = []
    for _, r in df.iterrows():
        try:
            records.append({"ticker": ticker, "year": int(r["yearReport"]), "quarter": int(r["lengthReport"]),
                            "total_assets": _f(r[a]) if a else None, "total_liabilities": _f(r[li]) if li else None,
                            "total_equity": _f(r[eq]) if eq else None, "short_term_debt": _f(r[std]) if std else None,
                            "long_term_debt": _f(r[ltd]) if ltd else None, "cash": _f(r[ca]) if ca else None})
        except Exception: pass
    n = rest_upsert("balance_sheet", records)
    print(f"    balance_sheet       : {n} rows")


def etl_cashflow(ticker: str):
    from vnstock import Vnstock
    s  = Vnstock().stock(symbol=ticker, source="VCI")
    df = _vnstock_fetch(s.finance.cash_flow, period="quarter", lang="en")
    cols = df.columns.tolist()
    op  = _find(cols, ["operating activities"])
    inv = _find(cols, ["investing activities"])
    fin = _find(cols, ["financial activities", "financing activities"])
    records = []
    for _, r in df.iterrows():
        try:
            records.append({"ticker": ticker, "year": int(r["yearReport"]), "quarter": int(r["lengthReport"]),
                            "operating_cf": _f(r[op]) if op else None,
                            "investing_cf": _f(r[inv]) if inv else None,
                            "financing_cf": _f(r[fin]) if fin else None})
        except Exception: pass
    n = rest_upsert("cash_flow", records)
    print(f"    cash_flow           : {n} rows")


def etl_ratios(ticker: str):
    from vnstock import Vnstock
    s  = Vnstock().stock(symbol=ticker, source="VCI")
    df = _vnstock_fetch(s.finance.ratio, period="quarter", lang="en")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [col[1] for col in df.columns]
    cols = df.columns.tolist()
    pe  = _find(cols, ["P/E"]); pb  = _find(cols, ["P/B"])
    roe = _find(cols, ["ROE"]); roa = _find(cols, ["ROA"])
    eps = _find(cols, ["EPS"]); de  = _find(cols, ["Debt/Equity"])
    cr  = _find(cols, ["current ratio"])
    records = []
    for _, r in df.iterrows():
        try:
            records.append({"ticker": ticker, "year": int(r["yearReport"]), "quarter": int(r["lengthReport"]),
                            "pe": _f(r[pe]) if pe else None, "pb": _f(r[pb]) if pb else None,
                            "roe": _f(r[roe]) if roe else None, "roa": _f(r[roa]) if roa else None,
                            "eps": _f(r[eps]) if eps else None, "debt_to_equity": _f(r[de]) if de else None,
                            "current_ratio": _f(r[cr]) if cr else None})
        except Exception: pass
    n = rest_upsert("financial_ratios", records)
    print(f"    financial_ratios    : {n} rows")

# ─── Runner ───────────────────────────────────────────────────────────────────

def process(ticker: str, mode: str):
    print(f"\n>>> {ticker}")
    try:
        if mode in ("all", "prices"):
            etl_prices(ticker); time.sleep(0.8)
        if mode in ("all", "financials"):
            for fn, label in [(etl_income,"income"),(etl_balance,"balance"),
                              (etl_cashflow,"cashflow"),(etl_ratios,"ratios")]:
                try:
                    fn(ticker)
                except Exception as e:
                    print(f"    [{label}] ERROR: {e}")
                time.sleep(0.8)
    except Exception as e:
        print(f"    FAILED: {e}")

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode",   choices=["all", "prices", "financials"], default="all")
    parser.add_argument("--ticker", help="Chạy 1 ticker, vd: --ticker VCB")
    args = parser.parse_args()

    tickers = [args.ticker.upper()] if args.ticker else TICKERS
    print(f"=== ETL Start | mode={args.mode} | {len(tickers)} tickers ===")
    print(f"    Proxy: {PROXY or 'none'}")

    # Test kết nối Supabase
    try:
        rows = rest_select("companies", "ticker")
        print(f"    Supabase OK — {len(rows)} companies in DB\n")
    except Exception as e:
        print(f"    Supabase FAILED: {e}")
        return

    for i, t in enumerate(tickers):
        process(t, args.mode)
        if i < len(tickers) - 1:
            time.sleep(3)   # pace: 20 req/min limit, mỗi ticker ~5 req

    print("\n=== ETL Done ===")

if __name__ == "__main__":
    main()
