# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack Vietnamese stock market analysis platform. Three subsystems that must run together:
- **Frontend:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- **Backend:** FastAPI (Python, port 8000)
- **ETL:** Python script using vnstock3 to crawl Vietnamese stock data → Supabase

## Commands

### Frontend (`frontend/`)
```bash
npm run dev       # Dev server on port 3000
npm run build     # Production build
npm run lint      # ESLint
```

### Backend (`backend/`)
```bash
# Must activate venv first
uvicorn main:app --reload --port 8000
```

### ETL (`etl/`)
```bash
python etl.py                       # All tickers, all data
python etl.py --mode prices         # Prices only
python etl.py --mode financials     # Financials only
python etl.py --ticker VCB          # Single ticker
```

## Architecture

### Request Flow
- **Server-side (Next.js SSR):** fetches directly to `http://localhost:8000`
- **Client-side (browser):** fetches via `/api/proxy/[...path]` → `localhost:8000`

The proxy exists because FPT's HTTP_PROXY environment variable interferes with direct browser requests.

### Frontend Structure
- `app/page.tsx` — Market overview (breadth stats, sector cards, stock table)
- `app/stocks/[ticker]/page.tsx` — Stock detail: price header, candlestick chart, financial tabs
- `app/compare/page.tsx` — Stock comparison (normalized price + ratio side-by-side)
- `app/api/proxy/[...path]/route.ts` — Next.js proxy to FastAPI
- `lib/api.ts` — Typed fetch wrapper and all TypeScript interfaces
- `lib/utils.ts` — `fmt()`, `fmtVol()`, `pctClass()`, `pctSign()`, `daysAgo()`

Pages use Server Components with ISR (`revalidate: 60–3600`). Interactive charts and tables are Client Components.

### Backend Structure (`backend/`)
- `main.py` — FastAPI app, CORS config, router registration
- `db.py` — Async Supabase REST client (select, rpc, handles FPT proxy)
- `routers/market.py` — `/api/market/overview`, `/api/market/sectors`
- `routers/stocks.py` — `/api/stocks/{ticker}`, prices, income, balance, cashflow, ratios
- `routers/compare.py` — `/api/compare/prices` (normalized base=100), `/api/compare/ratios`

### Database (Supabase PostgreSQL)
Tables: `companies`, `sectors`, `price_history`, `income_statement`, `balance_sheet`, `cash_flow`, `financial_ratios`

All DB access goes through Supabase REST API (PostgREST), not direct PostgreSQL connection.

### ETL
- Data source: `vnstock3` library (Vietnamese stock market crawler)
- Upserts in 400-record chunks (Supabase REST limit)
- Rate-limit handling: vnstock3 calls `sys.exit()` on API limit → ETL catches `SystemExit` and retries after 65s
- Tracks 19 tickers: major banks, real estate, manufacturing, tech, F&B

## Environment Variables

**`backend/.env` and `etl/.env`:**
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
HTTP_PROXY=http://proxy.fpt.vn:80
HTTPS_PROXY=http://proxy.fpt.vn:80
NO_PROXY=localhost,127.0.0.1,*.fpt.net,*.local
```

**`frontend/.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Design Conventions
- **Color scheme:** Dark navy/slate background (`#030712`), emerald green for gains (`#22c55e`), red for losses (`#ef4444`)
- **Charts:** Lightweight Charts v5 for candlesticks/volume, Recharts for financial bar/line charts
- **Language:** UI labels and comments are in Vietnamese
