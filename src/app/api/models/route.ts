import { google, sheets_v4 } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

interface GoogleAuthTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

const SPREADSHEET_ID = process.env.GOOGLE_DRIVE_SHEET_MODEL_NAMES;
const MODEL_HEADER = "Client Name";
const MODEL_PROFILE = "Profile Link";
const MODEL_STATUS = "Status"; // Add the status header

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("google_auth_tokens");

  if (!tokensCookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value) as GoogleAuthTokens;

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

    const sheets: sheets_v4.Sheets = google.sheets({
      version: "v4",
      auth: oauth2Client,
    });

    // First, get the sheet metadata to work with
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    // Make sure we have sheets
    if (!spreadsheet.data.sheets || spreadsheet.data.sheets.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Get the first sheet's title
    const targetSheetTitle = "Client Info";

    // Now get the data with a proper range
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${targetSheetTitle}!A:Z`,
    });

    // Handle potentially null or undefined values
    const values = sheetData.data.values ?? [];

    if (values.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Find all column headers
    const headers: string[] = values[0] as string[];

    // Get the indexes for name, profile, and status
    const nameIndex = headers.indexOf(MODEL_HEADER);
    const profileIndex = headers.indexOf(MODEL_PROFILE);
    const statusIndex = headers.indexOf(MODEL_STATUS);

    if (nameIndex === -1 || profileIndex === -1 || statusIndex === -1) {
      return NextResponse.json([], { status: 200 });
    }

    const models: { name: string; profile: string; status: string }[] = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i] as string[];
      const name = row[nameIndex]?.trim();
      const profile = row[profileIndex]?.trim() || ""; // allow missing profiles
      const status = row[statusIndex]?.trim() || "Unknown"; // Default to "Unknown" if status is empty

      if (name) {
        models.push({ name, profile, status });
      }
    }

    return NextResponse.json(models, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching models:", error);

    // Enhanced error logging
    if (error && typeof error === "object" && "response" in error) {
      console.error("Response details:", error.response);
    }

    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
