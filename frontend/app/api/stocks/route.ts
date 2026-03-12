import { NextResponse } from "next/server";
import { getStocks } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await getStocks());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
