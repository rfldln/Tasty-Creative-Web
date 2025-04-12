import { NextRequest, NextResponse } from "next/server";

const DISCORD_API_URL = "https://discord.com/api/v10";
const LIVE_CHANNEL_ID = process.env.DISCORD_LIVE_CHANNEL_ID;
const VIP_CHANNEL_ID = process.env.DISCORD_VIP_CHANNEL_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();


    const customImage = formData.get("customImage") as string;
    const date = formData.get("date") as string;
    const model = formData.get("model") as string;
    const paid = formData.get("paid") as string;
    const time = formData.get("time") as string;
    const timezone = formData.get("timezone") as string;
    const imageId = formData.get("imageId") as string;
    const requestId = formData.get("requestId") as string;
    const timestamp = formData.get("timestamp") as string;
    const imageName = formData.get("imageName") as string;
    const noOfTemplate = formData.get("noOfTemplate") as string;
    const isCustomRequest = formData.get("isCustomRequest") as string;
    const customDetails = formData.get("customDetails") as string;
    const type = formData.get("type") as string;
    const header = formData.get("header") as string;

    const imageFile = formData.get("imageFile") as File | null;

    if (!BOT_TOKEN) {
      return NextResponse.json(
        { error: "Discord bot token is not configured" },
        { status: 500 }
      );
    }

    let userName;
    let userEmail;

    const userCookie = req.cookies.get("google_user")?.value;
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);
        if (user?.name) userName=user.name;
        if (user?.email) userEmail = user.email;
      } catch (err) {
        console.error("Failed to parse google_user cookie:", err);
      }
    }

    const messageContent = createFormattedMessage({
      customImage,
      date,
      model,
      paid: paid === "true",
      time,
      timezone,
      imageId,
      requestId,
      timestamp,
      imageName,
      noOfTemplate: parseInt(noOfTemplate || "0"),
      isCustomRequest: isCustomRequest === "true",
      customDetails,
      type,
      header,
      userName,
      userEmail,
    });

    const discordFormData = new FormData();

    discordFormData.append(
      "payload_json",
      JSON.stringify({
        content: messageContent,
      })
    );

    if (imageFile && customImage === "true") {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      discordFormData.append(
        "files[0]",
        new Blob([buffer], { type: imageFile.type }),
        imageFile.name
      );
    }

    const channelID = type === "VIP" ? VIP_CHANNEL_ID : LIVE_CHANNEL_ID;

    const response = await fetch(
      `${DISCORD_API_URL}/channels/${channelID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
        body: discordFormData,
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown Discord API error" }));
      console.error("Discord API error:", errorData);
      return NextResponse.json(
        { error: "Failed to send message to Discord", details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, message: result });
  } catch (error) {
    console.error("Error sending message to Discord:", error);
    return NextResponse.json(
      { error: "Failed to process request", details: String(error) },
      { status: 500 }
    );
  }
}

function createFormattedMessage(data: {
  customImage: string;
  date: string;
  model: string;
  paid: boolean;
  time: string;
  timezone: string;
  imageId: string;
  requestId: string;
  timestamp: string;
  imageName: string;
  noOfTemplate: number;
  isCustomRequest: boolean;
  customDetails: string;
  type: string;
  header: string;
  userName: string;
  userEmail: string;
}) {
  const formattedDate = new Date(data.timestamp).toLocaleString();

  let message = `## Hey Design Team! ✨👋\n\n I hope you’re all having a fantastic day! We have a new request that I wanted to share with you. Here are the details: \n\n`;

  message += `**Request By:** ${data.userName} <${data.userEmail}>\n`;
  message += `**Submitted:** ${formattedDate}\n`;

  if (data.type) {
    message += `**Type:** ${data.type}\n`;
  }

  if (data.model) {
    message += `**Model:** ${data.model}\n`;
  }

  if (data.date) {
    message += `**Date:** ${data.date}\n`;
  }

  if (data.time) {
    message += `**Time:** ${data.time} ${data.timezone || ""}\n`;
  }

  if (data.noOfTemplate > 0) {
    message += `**Number of Templates:** ${data.noOfTemplate}\n`;
  }

  message += `**Paid:** ${data.paid ? "Yes" : "No"}\n`;
  message += `**Custom Image:** ${data.customImage ? "Yes" : "No"}\n`;

  if (data.imageName) {
    message += `**Image Name:** ${data.imageName}\n`;
  }

  if (data.imageId) {
    message += `**Image ID:** ${data.imageId}\n`;
    message += `**Image Link:** https://drive.google.com/file/d/${data.imageId}/view?usp=drivesdk\n`;
    message += "If the link doesn't work, there's an image attached below!";
  }

  if (data.isCustomRequest) {
    message += `\n**Custom Request Details:**\n`;
    message += data.customDetails
      ? `\`\`\`\n${data.customDetails}\n\`\`\`\n`
      : "*No details provided*\n";
  }

  message +=
    "Thanks for all your hard work, team! 💖 Don't hesitate to reach out if you need anything else!";

  return message;
}
