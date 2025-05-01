import { google, sheets_v4 } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

interface GoogleAuthTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

const SPREADSHEET_ID = process.env.GOOGLE_DRIVE_SHEET_MODEL_NAMES;

const FIELDS = [
  "Client Name",
  "Status",
  "Launch Date",
  "Referrer Name",
  "Personality Type",
  "Common Terms",
  "Common Emojis",
  "Main Instagram @",
  "Main Twitter @",
  "Main TikTok @",
  "Profile Link",
];

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const modelName = searchParams?.get("name");

  if (!modelName) {
    return NextResponse.json(
      { error: "Model name is required" },
      { status: 400 }
    );
  }

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

    oauth2Client.setCredentials(tokens);

    const sheets: sheets_v4.Sheets = google.sheets({
      version: "v4",
      auth: oauth2Client,
    });

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const firstSheetTitle = spreadsheet.data.sheets?.[0]?.properties?.title;
    if (!firstSheetTitle) {
      return NextResponse.json({}, { status: 200 });
    }

    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${firstSheetTitle}!A:Z`,
    });

    const values = sheetData.data.values ?? [];

    if (values.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    const headers: string[] = values[0] as string[];

    const headerIndexes = FIELDS.reduce((acc, field) => {
      const index = headers.indexOf(field);
      acc[field] = index;
      return acc;
    }, {} as Record<string, number>);

    const modelRow = values.find((row, index) => {
      if (index === 0) return false;
      const nameIndex = headerIndexes["Client Name"];
      return row[nameIndex]?.trim().toLowerCase() === modelName.toLowerCase();
    }) as string[] | undefined;

    const result: Record<string, string> = {};
    FIELDS.forEach((field) => {
      const index = headerIndexes[field];
      result[field] =
        index !== -1 && modelRow ? modelRow[index]?.trim() ?? "" : "";
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching model details:", error);
    return NextResponse.json(
      { error: "Failed to fetch model details" },
      { status: 500 }
    );
  }
}
