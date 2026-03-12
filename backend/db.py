"""
Supabase REST API async client.
Dùng httpx qua proxy để giao tiếp với Supabase PostgREST.
"""

import os
import httpx
from typing import Any

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
PROXY        = os.getenv("HTTP_PROXY") or os.getenv("HTTPS_PROXY")

_HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
}

def _client() -> httpx.AsyncClient:
    if PROXY:
        transport = httpx.AsyncHTTPTransport(proxy=PROXY)
        mounts = {"http://": transport, "https://": transport}
        return httpx.AsyncClient(headers=_HEADERS, mounts=mounts, timeout=30.0)
    return httpx.AsyncClient(headers=_HEADERS, timeout=30.0)


async def select(table: str, **params) -> list[dict]:
    """
    GET /rest/v1/{table}?...
    params ví dụ: select="ticker,date,close", order="date.desc", limit=10,
                  ticker="eq.VCB", date="gte.2024-01-01"
    """
    async with _client() as c:
        r = await c.get(f"{SUPABASE_URL}/rest/v1/{table}", params=params)
        r.raise_for_status()
        return r.json()


async def rpc(fn: str, body: dict) -> Any:
    """POST /rest/v1/rpc/{fn}"""
    async with _client() as c:
        r = await c.post(f"{SUPABASE_URL}/rest/v1/rpc/{fn}", json=body)
        r.raise_for_status()
        return r.json()
