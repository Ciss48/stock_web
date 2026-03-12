"""
indicators.py — Compute technical indicators from price_history → Supabase

Run after etl.py (prices must be up to date first):
  python indicators.py              # all tickers
  python indicators.py --ticker VCB # single ticker

Tables written:
  - technical_indicators  (sma20/50/200, ema20, BB, rsi14, macd)
  - market_daily_snapshot (latest close + change per ticker)
"""

import os, sys, math, time, argparse
os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv
load_dotenv()

PROXY = os.getenv("HTTP_PROXY") or os.getenv("HTTPS_PROXY")
PROXIES = {"http": PROXY, "https": PROXY} if PROXY else None

import requests
import pandas as pd

# ── Config ────────────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates",
}
CHUNK_SIZE = 400

TICKERS = [
    "VCB", "CTG", "BID", "VPB", "TCB", "MBB", "HDB", "STB",
    "VHM", "VIC", "NVL", "KDH", "DXG",
    "VNM", "HPG", "MSN", "SAB", "PNJ",
    "FPT", "VGI",
]

# ── REST helpers ──────────────────────────────────────────────────────────────

def rest_select(table: str, select: str, **filters) -> list[dict]:
    """Fetch all rows with automatic pagination (PostgREST default limit = 1000)."""
    params = f"select={select}"
    for k, v in filters.items():
        if k != "limit":          # ignore any manual limit — we paginate ourselves
            params += f"&{k}={v}"

    all_rows = []
    page_size = 1000
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?{params}&limit={page_size}&offset={offset}"
        headers = {**HEADERS, "Range-Unit": "items", "Range": f"{offset}-{offset + page_size - 1}"}
        resp = requests.get(url, headers=headers, proxies=PROXIES, timeout=30)
        resp.raise_for_status()
        rows = resp.json()
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size
    return all_rows


def rest_upsert(table: str, records: list[dict]) -> int:
    if not records:
        return 0
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    total = 0
    for i in range(0, len(records), CHUNK_SIZE):
        chunk = records[i:i + CHUNK_SIZE]
        resp = requests.post(url, json=chunk, headers=HEADERS,
                             proxies=PROXIES, timeout=30)
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
        total += len(chunk)
    return total

# ── Safe float ────────────────────────────────────────────────────────────────

def _f(val, decimals=4):
    try:
        if val is None:
            return None
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, decimals)
    except (TypeError, ValueError):
        return None

# ── Indicator functions ───────────────────────────────────────────────────────

def calc_sma(close: pd.Series, period: int) -> pd.Series:
    return close.rolling(window=period, min_periods=period).mean()


def calc_ema(close: pd.Series, period: int) -> pd.Series:
    return close.ewm(span=period, adjust=False).mean()


def calc_bollinger(close: pd.Series, period=20, n_std=2):
    middle = close.rolling(window=period, min_periods=period).mean()
    std    = close.rolling(window=period, min_periods=period).std()
    upper  = middle + n_std * std
    lower  = middle - n_std * std
    return upper, middle, lower


def calc_rsi(close: pd.Series, period=14) -> pd.Series:
    delta    = close.diff()
    gain     = delta.clip(lower=0)
    loss     = (-delta).clip(lower=0)
    avg_gain = gain.ewm(com=period - 1, adjust=False).mean()
    avg_loss = loss.ewm(com=period - 1, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, float("nan"))
    return 100 - (100 / (1 + rs))


def calc_macd(close: pd.Series, fast=12, slow=26, signal=9):
    ema_fast    = close.ewm(span=fast,   adjust=False).mean()
    ema_slow    = close.ewm(span=slow,   adjust=False).mean()
    macd_line   = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    hist        = macd_line - signal_line
    return macd_line, signal_line, hist

# ── Per-ticker processing ─────────────────────────────────────────────────────

def process_ticker(ticker: str):
    print(f"  {ticker} ...", end=" ", flush=True)

    rows = rest_select(
        "price_history",
        "date,open,high,low,close,volume",
        ticker=f"eq.{ticker}",
        order="date.asc",
        limit=10000,
    )

    if len(rows) < 30:
        print(f"skip (only {len(rows)} rows)")
        return

    df = pd.DataFrame(rows)
    df["date"]  = pd.to_datetime(df["date"])
    df["close"] = df["close"].astype(float)
    df = df.sort_values("date").reset_index(drop=True)
    close = df["close"]

    # Moving averages
    df["sma20"]  = calc_sma(close, 20)
    df["sma50"]  = calc_sma(close, 50)
    df["sma200"] = calc_sma(close, 200)
    df["ema20"]  = calc_ema(close, 20)

    # Bollinger Bands
    df["bb_upper"], df["bb_middle"], df["bb_lower"] = calc_bollinger(close)

    # RSI
    df["rsi14"] = calc_rsi(close, 14)

    # MACD
    df["macd_line"], df["macd_signal"], df["macd_hist"] = calc_macd(close)

    # Build upsert records for technical_indicators
    ti_records = [
        {
            "ticker":      ticker,
            "date":        row["date"].strftime("%Y-%m-%d"),
            "sma20":       _f(row["sma20"]),
            "sma50":       _f(row["sma50"]),
            "sma200":      _f(row["sma200"]),
            "ema20":       _f(row["ema20"]),
            "bb_upper":    _f(row["bb_upper"]),
            "bb_middle":   _f(row["bb_middle"]),
            "bb_lower":    _f(row["bb_lower"]),
            "rsi14":       _f(row["rsi14"]),
            "macd_line":   _f(row["macd_line"],   6),
            "macd_signal": _f(row["macd_signal"], 6),
            "macd_hist":   _f(row["macd_hist"],   6),
        }
        for _, row in df.iterrows()
    ]
    n_ti = rest_upsert("technical_indicators", ti_records)

    # Build market_daily_snapshot (one row per ticker)
    latest = df.iloc[-1]
    prev   = df.iloc[-2] if len(df) >= 2 else None

    prev_close = float(prev["close"]) if prev is not None else float(latest["open"] or latest["close"])
    curr_close = float(latest["close"])
    change     = round(curr_close - prev_close, 2)
    change_pct = round(change / prev_close * 100, 2) if prev_close else 0.0

    snapshot = [{
        "ticker":     ticker,
        "date":       latest["date"].strftime("%Y-%m-%d"),
        "open":       _f(latest["open"]),
        "high":       _f(latest["high"]),
        "low":        _f(latest["low"]),
        "close":      _f(latest["close"]),
        "volume":     int(latest["volume"]) if latest["volume"] else 0,
        "change":     change,
        "change_pct": change_pct,
    }]
    rest_upsert("market_daily_snapshot", snapshot)

    print(f"{n_ti} indicator rows, snapshot {latest['date'].strftime('%Y-%m-%d')}")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", help="Process a single ticker, e.g. --ticker VCB")
    args = parser.parse_args()

    tickers = [args.ticker.upper()] if args.ticker else TICKERS

    print(f"=== Indicators ETL | {len(tickers)} tickers ===")
    print(f"    Proxy : {PROXY or 'none'}")
    print(f"    DB    : {SUPABASE_URL[:40]}...")

    # Verify connection
    try:
        rows = rest_select("companies", "ticker")
        print(f"    Supabase OK — {len(rows)} companies\n")
    except Exception as e:
        print(f"    Supabase FAILED: {e}")
        return

    for ticker in tickers:
        try:
            process_ticker(ticker)
        except Exception as e:
            print(f"  {ticker} FAILED: {e}")
        time.sleep(0.3)

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
