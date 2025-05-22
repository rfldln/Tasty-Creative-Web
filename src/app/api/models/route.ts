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
const MODEL_STATUS = "Status";

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("google_auth_tokens");

  if (!tokensCookie) {
    console.warn("⚠️ No auth tokens found in cookies");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value) as GoogleAuthTokens;
    console.log("✅ Parsed Google tokens:", tokens);

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

    console.log("📄 Fetching spreadsheet metadata...");
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    if (!spreadsheet.data.sheets || spreadsheet.data.sheets.length === 0) {
      console.warn("⚠️ No sheets found in spreadsheet");
      return NextResponse.json([], { status: 200 });
    }

    const firstSheetTitle = spreadsheet.data.sheets[0]?.properties?.title;
    console.log("📝 First sheet title:", firstSheetTitle);

    if (!firstSheetTitle) {
      return NextResponse.json([], { status: 200 });
    }

    console.log("📊 Fetching sheet values...");
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${firstSheetTitle}!A:Z`,
    });

    const values = sheetData.data.values ?? [];
    console.log(`📦 Retrieved ${values.length} rows`);

    if (values.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const headers: string[] = values[0] as string[];
    console.log("🔎 Sheet headers:", headers);

    const nameIndex = headers.indexOf(MODEL_HEADER);
    const profileIndex = headers.indexOf(MODEL_PROFILE);
    const statusIndex = headers.indexOf(MODEL_STATUS);

    if (nameIndex === -1 || profileIndex === -1 || statusIndex === -1) {
      console.warn("⚠️ Required columns missing:", {
        nameIndex,
        profileIndex,
        statusIndex,
      });
      return NextResponse.json([], { status: 200 });
    }

    const models: { name: string; profile: string; status: string }[] = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i] as string[];
      const name = row[nameIndex]?.trim();
      const profile = row[profileIndex]?.trim() || "";
      const status = row[statusIndex]?.trim() || "Unknown";

      if (name) {
        models.push({ name, profile, status });
      }
    }

    console.log("✅ Models fetched:", models.length);
    return NextResponse.json(models, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching models:", error);

    if (error && typeof error === "object" && "response" in error) {
      console.error("🧾 Error response details:", (error as any).response);
    }

    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
