import { NextRequest, NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/rag";

export async function POST(req: NextRequest) {
  const { query, top_k = 3 } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const matches = await searchKnowledge(query, top_k);
  return NextResponse.json({ matches });
}