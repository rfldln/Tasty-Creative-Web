import { google, sheets_v4 } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

interface GoogleAuthTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

const SPREADSHEET_ID = "1Ad_I-Eq11NWKT1jqPB9Bw6L1jVKBHHLqR4ZBLBT9XtU";

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
      "https://legacy.tastycreative.xyz/api/google/callback"
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
      return NextResponse.json([], { status: 200 });
    }

    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${firstSheetTitle}!A:Z`,
    });

    const values = data.values ?? [];

    if (values.length < 2) {
      return NextResponse.json([], { status: 200 });
    }

    const headers = values[0] as string[];
    const modelIndex = headers.indexOf("Model");

    if (modelIndex === -1) {
      return NextResponse.json(
        { error: "Model column not found" },
        { status: 400 }
      );
    }

    const rows = values
      .slice(1)
      .filter((row) => row[modelIndex]?.trim()) // filter rows with non-empty "Model"
      .map((row) => {
        const rowObj: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowObj[header] = row[index]?.trim() || "";
        });
        return rowObj;
      });

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching filtered model data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
