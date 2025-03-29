import { google } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SPREADSHEET_ID = process.env.GOOGLE_DRIVE_SHEET_MODEL_NAMES;
const RANGE = "G:G"; // Column G contains the models

export async function GET() {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("google_auth_tokens");

  if (!tokensCookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    if (!response.data.values || response.data.values.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const models = response.data.values
      .flat()
      .filter((name) => name !== "Client Name");

    return NextResponse.json(models, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
