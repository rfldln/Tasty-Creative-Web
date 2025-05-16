import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { type } = body;

    const itemsWebhook =
      "https://n8n.tastycreative.xyz/webhook/ec2031c9-7205-4bc2-bdde-eac8797dbfeb";
    const listWebhook =
      "https://n8n.tastycreative.xyz/webhook/03ec74ab-7791-4977-a6a5-227887f92dad";

    let webhookUrl = listWebhook;

    if (type === "list") {
      webhookUrl = listWebhook;
    } else if (type === "item") {
      webhookUrl = itemsWebhook;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync data." },
      { status: 500 }
    );
  }
}
