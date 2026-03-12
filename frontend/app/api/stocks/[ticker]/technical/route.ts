import { NextResponse } from "next/server";
import { getTechnicalData } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  try {
    const { ticker } = await params;
    const days = parseInt(new URL(req.url).searchParams.get("days") ?? "90");
    return NextResponse.json(await getTechnicalData(ticker, days));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
