import { NextRequest, NextResponse } from "next/server";

const webhookUrl = process.env.WEBHOOK_URL!;
const discordWebhookUrl = process.env.DISCORD_BOT_WEBHOOK_URL!;
const vipWebhookUrl = process.env.VIP_WEBHOOK_URL!;
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get isCustomRequest from form data
    const isCustomRequest = formData.get("isCustomRequest") === "true";
    const isVip = formData.get("type") === "VIP";

    // Prepare FormData for forwarding
    const forwardData = new FormData();

    formData.forEach((value, key) => {
      if (key === "model" && typeof value === "string") {
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

    // 🧠 Extract google_user from cookie
    const userCookie = request.cookies.get("google_user")?.value;
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);
        if (user?.name) forwardData.append("user_name", user.name);
        if (user?.email) forwardData.append("user_email", user.email);
      } catch (err) {
        console.error("Failed to parse google_user cookie:", err);
      }
    }

    // Determine which URL to use
    const targetUrl = isCustomRequest
      ? discordWebhookUrl
      : isVip
      ? vipWebhookUrl
      : webhookUrl;
    console.log("targetUrl", targetUrl);

    // Forward the request
    const response = await fetch(targetUrl, {
      method: "POST",
      body: forwardData,
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
