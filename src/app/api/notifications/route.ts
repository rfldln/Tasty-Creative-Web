import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export async function GET() {
  try {
    console.log("Starting GET request...");

    const cookieStore = await cookies();
    const tokensCookie = cookieStore.get("google_auth_tokens");

    if (!tokensCookie) {
      console.log("Not authenticated. No token found.");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tokens = JSON.parse(tokensCookie.value);
    console.log("Tokens retrieved:", tokens);

    // Setup OAuth2 client
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

    // Setup Sheets API client
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // Fetch all rows in the Notifications sheet, starting from row 2
    const spreadsheetId = "1Ad_I-Eq11NWKT1jqPB9Bw6L1jVKBHHLqR4ZBLBT9XtU";
    const range = "Notifications!A2:G";
    console.log(`Fetching data from spreadsheetId: ${spreadsheetId}, range: ${range}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    console.log("Fetched rows:", rows);

    if (!rows || rows.length === 0) {
      console.log("No notifications found.");
      return NextResponse.json({ message: "No notifications found" });
    }

    const notifications = rows.map((row) => ({
      timestamp: row[0],
      message: row[1],
      model: row[2],
      editedBy: row[3],
      row: row[4],
      sheet: row[5],
      editedData: row[6] ? JSON.parse(row[6]) : {},
    }));

    console.log("Notifications fetched successfully:", notifications);

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ message: "Error fetching notifications" }, { status: 500 });
  }
}
