import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const tokensCookie = cookieStore.get("google_auth_tokens");

    if (!tokensCookie) {
      console.log("Authentication error: No tokens found in cookies.");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tokens = JSON.parse(tokensCookie.value);
    console.log("Parsed tokens:", tokens);

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

    console.log("OAuth2 client set up successfully.");

    // Setup Sheets API client
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // Define spreadsheet and range
    const spreadsheetId = "1Ad_I-Eq11NWKT1jqPB9Bw6L1jVKBHHLqR4ZBLBT9XtU"; // Your Google Sheets ID
    const range = "Notifications!A2:G2"; // Range to get the latest notification

    console.log("Fetching data from Google Sheets...");
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const data = response.data;

    console.log("Data received from Google Sheets:", data);

    if (!data.values || data.values.length === 0) {
      console.log("No notifications found.");
      return NextResponse.json({ message: "No notifications found" });
    }

    const notification = data.values[0];
    console.log("Notification data:", notification);

    return NextResponse.json({
      notification: {
        timestamp: notification[0],
        message: notification[1],
        model: notification[2],
        editedBy: notification[3],
        row: notification[4],
        sheet: notification[5],
        editedData: JSON.parse(notification[6]),
      },
    });
  } catch (error) {
    console.error("Error fetching notification:", error);
    return NextResponse.json({ message: "Error fetching notification" }, { status: 500 });
  }
}
