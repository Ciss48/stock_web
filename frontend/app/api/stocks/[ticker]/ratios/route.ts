import { NextResponse } from "next/server";
import { getRatios } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  try {
    const { ticker } = await params;
    const q = parseInt(new URL(req.url).searchParams.get("quarters") ?? "12");
    return NextResponse.json(await getRatios(ticker, q));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
