import { NextResponse } from "next/server";
import { getComparePrices } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tickers = (searchParams.get("tickers") ?? "")
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (tickers.length < 2) return NextResponse.json({ error: "Need at least 2 tickers" }, { status: 400 });

    const start = searchParams.get("start") ?? new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    return NextResponse.json(await getComparePrices(tickers, start, searchParams.get("end") ?? undefined));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
