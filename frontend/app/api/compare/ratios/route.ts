import { NextResponse } from "next/server";
import { getCompareRatios } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const tickers = (new URL(req.url).searchParams.get("tickers") ?? "")
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (!tickers.length) return NextResponse.json({ error: "No tickers" }, { status: 400 });
    return NextResponse.json(await getCompareRatios(tickers));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
