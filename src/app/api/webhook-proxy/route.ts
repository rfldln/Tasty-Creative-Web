import { NextResponse } from "next/server";

const webhookUrl = process.env.WEBHOOK_URL!;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Prepare FormData for forwarding
    const forwardData = new FormData();

    // Forward only non-file fields
    formData.forEach((value, key) => {
      if (key !== "imageFile") {
        forwardData.append(key, value);
      }
    });

    // Append the file separately
    const imageFile = formData.get("imageFile") as File | null;
    if (imageFile) {
      forwardData.append("data", imageFile, imageFile.name);
    }

    // Forward the request
    const response = await fetch(webhookUrl, {
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
