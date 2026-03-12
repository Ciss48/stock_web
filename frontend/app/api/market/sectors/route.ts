import { NextResponse } from "next/server";
import { getMarketSectors } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await getMarketSectors());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
