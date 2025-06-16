import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://legacy.tastycreative.xyz/api/callback/google"
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams?.get("tab");
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
    "profile",
    "email",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Ensures refresh token is granted
    include_granted_scopes: true,
    state: JSON.stringify({ tab }), // Add tab to state
  });

  return NextResponse.json({ authUrl });
}
