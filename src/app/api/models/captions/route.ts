import { NextRequest, NextResponse } from "next/server";
import { google, sheets_v4 } from "googleapis";
import { cookies } from "next/headers";

interface GoogleAuthTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("google_auth_tokens");

  if (!tokensCookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { id, code } = await request.json();

    if (!id || !code) {
      return NextResponse.json(
        { error: "Missing required parameters: id and code" },
        { status: 400 }
      );
    }

    const tokens = JSON.parse(tokensCookie.value) as GoogleAuthTokens;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://legacy.tastycreative.xyz/api/callback/google"
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

    // Get the sheet metadata to find the correct sheet
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: id,
    });

    const sheetNames =
      spreadsheet.data.sheets?.map((sheet: any) => sheet.properties.title) ||
      [];

    // Find sheet that contains the code (case insensitive)
    const targetSheetName = sheetNames.find((name: string) =>
      name.toLowerCase().includes(code.toLowerCase())
    );

    if (!targetSheetName) {
      return NextResponse.json(
        { error: `No sheet found containing code: ${code}` },
        { status: 404 }
      );
    }

    // Get all data from the target sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: `${targetSheetName}!A:Z`, // Get all columns
    });

    const rows = response.data.values || [];

    if (rows.length < 2) {
      return NextResponse.json(
        { error: "Sheet does not contain enough data" },
        { status: 400 }
      );
    }

    const headers = rows[0]; // First row contains headers
    const dataRows = rows.slice(1); // Skip header row

    // Find the Caption column (header row index)
    const captionColumnIndex = headers.findIndex((header: string) =>
      header.toLowerCase().includes("caption")
    );

    if (captionColumnIndex === -1) {
      return NextResponse.json(
        { error: "Caption column not found in sheet" },
        { status: 404 }
      );
    }

    // Find columns that contain "MM" in header (these should have "Unlock" values)
    const mmColumnIndices = headers
      .map((header: string, index: number) =>
        header.toLowerCase().includes("mm") ? index : -1
      )
      .filter((index: number) => index !== -1);

    if (mmColumnIndices.length === 0) {
      return NextResponse.json(
        { error: "No MM columns found in sheet" },
        { status: 404 }
      );
    }

    // Find captions where any MM column (column B onwards, row 2 onwards) has "Unlock"
    const unlockedCaptions: string[] = [];

    dataRows.forEach((row: string[], rowIndex: number) => {
      // Check if any MM column in this row has "Unlock" value
      const hasUnlock = mmColumnIndices.some((colIndex: number) => {
        const cellValue = row[colIndex];
        return cellValue && cellValue.toLowerCase().includes("unlock");
      });

      if (hasUnlock && row[captionColumnIndex]) {
        unlockedCaptions.push(row[captionColumnIndex]);
      }
    });

    return NextResponse.json({
      success: true,
      sheetName: targetSheetName,
      code: code,
      unlockedCaptions: unlockedCaptions,
      totalFound: unlockedCaptions.length,
    });
  } catch (error: any) {
    console.error("Error fetching Google Sheets data:", error);

    // Handle token refresh if needed
    if (error.code === 401) {
      return NextResponse.json(
        { error: "Authentication expired. Please re-authenticate." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch data from Google Sheets",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST instead." },
    { status: 405 }
  );
}
