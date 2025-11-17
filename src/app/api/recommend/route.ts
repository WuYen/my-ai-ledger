import { NextResponse } from "next/server";
import { aiRecommendSimple } from "@/domain/ledger/recommend/recommendEngineSimple";

export async function GET() {
  const result = await aiRecommendSimple();
  return NextResponse.json(result);
}
