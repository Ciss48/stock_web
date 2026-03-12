import { NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  try {
    const { ticker } = await params;
    const { searchParams } = new URL(req.url);
    return NextResponse.json(
      await getPriceHistory(ticker, searchParams.get("start") ?? undefined, searchParams.get("end") ?? undefined)
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
