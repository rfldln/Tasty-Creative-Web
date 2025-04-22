import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { requestId } = await request.json();

    console.log("Received requestId:", requestId);

    const webhookUrl =
      "https://shining-duckling-smiling.ngrok-free.app/webhook/12730df2-a458-42b4-a7a8-821696b819a9";

    const response = await fetch(webhookUrl, {
      method: "POST",
      body: JSON.stringify({ requestId }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error calling webhook:", error);
    return NextResponse.json(
      { success: false, error: "Failed to call webhook" },
      { status: 500 }
    );
  }
}
