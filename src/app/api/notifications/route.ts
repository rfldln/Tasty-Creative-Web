// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";

const VALID_API_KEY = "pogiko123";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let notifications: any[] = []; // temp in-memory store

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== VALID_API_KEY) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { message, data } = await req.json();
    const timestamp = new Date().toISOString();

    const notification = { message, ...data, timestamp };
    notifications.unshift(notification); // Add to the top
    notifications = notifications.slice(0, 10); // Limit to last 10

    console.log("Received notification:", notification);

    return NextResponse.json({ message: "Notification received" });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ notifications });
}
