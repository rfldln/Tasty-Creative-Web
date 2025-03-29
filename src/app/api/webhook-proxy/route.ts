import { NextResponse } from "next/server";

const webhookUrl = process.env.WEBHOOK_URL!;
const discordWebhookUrl = process.env.DISCORD_BOT_WEBHOOK_URL!;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Get isCustomRequest from form data
    const isCustomRequest = formData.get("isCustomRequest") === "true";

    console.log("isCustomRequest", isCustomRequest);

    // Prepare FormData for forwarding
    const forwardData = new FormData();

    formData.forEach((value, key) => {
      if (key === "model" && typeof value === "string") {
        // Extract value inside parentheses if present (e.g., "Victoria (V)" → "V")
        const match = value.match(/\(([^)]+)\)$/);
        const formattedModel = match ? match[1] : value;
        forwardData.append("model", formattedModel);
      } else if (key !== "imageFile" && key !== "isCustomRequest") {
        forwardData.append(key, value);
      }
    });

    // Append the file separately
    const imageFile = formData.get("imageFile") as File | null;
    if (imageFile) {
      forwardData.append("data", imageFile, imageFile.name);
    }

    // Determine which URL to use based on isCustomRequest
    const targetUrl = isCustomRequest ? discordWebhookUrl : webhookUrl;
    console.log("targetUrl", targetUrl);

    // Forward the request
    const response = await fetch(targetUrl, {
      method: "POST",
      body: forwardData, // Forward as FormData
    });

    const textData = await response.text();
    try {
      const jsonData = JSON.parse(textData);
      return NextResponse.json(jsonData);
    } catch {
      return NextResponse.json({ error: "Invalid JSON response from webhook" });
    }
  } catch (error) {
    console.error("Webhook proxy error:", error);
    return NextResponse.json(
      { error: "Failed to call webhook" },
      { status: 500 }
    );
  }
}
