import { NextResponse } from "next/server";
import { getMarketOverview } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await getMarketOverview());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
