import { NextRequest, NextResponse } from "next/server";
// import { routerChain } from "@/chains/routerChain";

export async function POST(request: NextRequest) {
  const { question } = await request.json();
  console.log("question is", question)
  try {
    //const result = await routerChain(question);
    return NextResponse.json({ result: "This is a mock response for question: " + question });
  } catch (e) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
