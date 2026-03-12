"""
FastAPI Backend — Stock Analysis Vietnam
Chạy: uvicorn main:app --reload --port 8000
"""

import os
from dotenv import load_dotenv
load_dotenv()

# Cấu hình proxy trước khi httpx được dùng
for k in ("HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY"):
    v = os.getenv(k)
    if v:
        os.environ[k] = v
        os.environ[k.lower()] = v

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import market, stocks, compare

app = FastAPI(
    title="Stock Analysis API",
    description="API phân tích chứng khoán Việt Nam",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Frontend bất kỳ port nào cũng được (dev)
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(market.router)
app.include_router(stocks.router)
app.include_router(compare.router)


@app.get("/")
async def root():
    return {
        "status": "ok",
        "docs":   "/docs",
        "endpoints": [
            "GET /api/market/overview",
            "GET /api/market/sectors",
            "GET /api/stocks",
            "GET /api/stocks/{ticker}",
            "GET /api/stocks/{ticker}/prices?start=&end=",
            "GET /api/stocks/{ticker}/income?quarters=12",
            "GET /api/stocks/{ticker}/balance?quarters=12",
            "GET /api/stocks/{ticker}/cashflow?quarters=12",
            "GET /api/stocks/{ticker}/ratios?quarters=12",
            "GET /api/compare/prices?tickers=VCB,CTG",
            "GET /api/compare/ratios?tickers=VCB,CTG",
        ],
    }
