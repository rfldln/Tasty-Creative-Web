import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { requestId } = await request.json();

  console.log("✅ n8n confirmed with requestId:", requestId);

  (
    await 
    cookies()
  ).set("webhookConfirmed", "true", {
    httpOnly: false,
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.json({ success: true, message: "Confirmation received" });
}
