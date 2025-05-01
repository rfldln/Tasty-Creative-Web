import { NextRequest, NextResponse } from "next/server";
// Store webhook data mapped to requestId
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const webhookResponses: Record<string, any> = {};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { requestId } = body;

  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }

  webhookResponses[requestId] = {
    data: body,
    timestamp: Date.now(),
  };

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestId = searchParams?.get("requestId");

  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }

  const response = webhookResponses[requestId] || null;

  // Clear the stored response after retrieval
  delete webhookResponses[requestId];

  return NextResponse.json(response);
}
