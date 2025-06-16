// app/api/google/sheets/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  console.log("Received request:", request.nextUrl.toString());

  const searchParams = request.nextUrl.searchParams;
  const requestId = searchParams?.get("requestId");
  const spreadsheetId =
    searchParams?.get("spreadsheetId") || process.env.GOOGLE_SHEET_VIP_ID;
  const range =
    searchParams?.get("range") ||
    process.env.GOOGLE_SHEET_RANGE ||
    "VIP Gen Tracker!A:Z";
  const headerRowIndex = Number(searchParams?.get("headerRow") || "3");

  console.log(
    "Search Params - requestId:",
    requestId,
    "spreadsheetId:",
    spreadsheetId,
    "range:",
    range,
    "headerRow:",
    headerRowIndex
  );

  if (!requestId) {
    return NextResponse.json(
      { error: "Request ID is required" },
      { status: 400 }
    );
  }

  if (!spreadsheetId) {
    return NextResponse.json(
      { error: "Spreadsheet ID is required" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("google_auth_tokens");

  if (!tokensCookie) {
    console.log("Authentication error: No tokens found in cookies.");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);

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

    console.log("OAuth2 client set up successfully.");

    // Initialize the Google Sheets API
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    console.log(
      `Fetching data from spreadsheet ${spreadsheetId}, range ${range}`
    );

    // Fetch the values AND formulas to get both the displayed value and formula
    const [valuesResponse, formulasResponse] = await Promise.all([
      // Get the displayed values
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: "FORMATTED_VALUE", // Get the displayed value, not the formula
      }),

      // Get the formulas
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: "FORMULA", // Get the actual formulas
      }),
    ]);

    const valueRows = valuesResponse.data.values;
    const formulaRows = formulasResponse.data.values;

    if (!valueRows || valueRows.length === 0) {
      console.log("No data found in the spreadsheet");
      return NextResponse.json(
        { error: "No data found in the spreadsheet" },
        { status: 404 }
      );
    }

    // Get headers from the specified row
    const headerRowIdx = headerRowIndex - 1; // Convert from 1-based to 0-based indexing

    if (headerRowIdx >= valueRows.length) {
      return NextResponse.json(
        {
          error: `Header row ${headerRowIndex} is out of range. Spreadsheet only has ${valueRows.length} rows.`,
        },
        { status: 400 }
      );
    }

    const headers = valueRows[headerRowIdx];
    console.log("Headers from row", headerRowIndex, ":", headers);

    // Find the Request ID column
    let requestIdColumnIndex = -1;
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (typeof header === "string" && header.includes("Request ID")) {
        requestIdColumnIndex = i;
        break;
      }
    }

    if (requestIdColumnIndex === -1) {
      console.log("Request ID column not found in headers:", headers);
      return NextResponse.json(
        {
          error: "Request ID column not found in spreadsheet",
          availableHeaders: headers,
        },
        { status: 500 }
      );
    }

    // Convert sheet data to array of objects with both values and formulas
    const data = valueRows.slice(headerRowIdx + 1).map((row, rowIndex) => {
      const formulaRow = (formulaRows ?? [])[headerRowIdx + 1 + rowIndex] || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rowObject: Record<string, any> = {};

      headers.forEach((header: string, index: number) => {
        const value = index < row.length ? row[index] || "" : "";
        const formula =
          index < formulaRow.length ? formulaRow[index] || "" : "";

        // If the cell contains a formula, provide both the formula and its displayed value
        if (formula && formula.startsWith("=")) {
          // Extract file ID from HYPERLINK formula if it exists
          let fileId = null;
          if (formula.includes("drive.google.com/file/d/")) {
            // Extract the file ID from the formula
            const fileIdMatch = formula.match(
              /drive\.google\.com\/file\/d\/([^\/]+)/
            );
            if (fileIdMatch && fileIdMatch[1]) {
              fileId = fileIdMatch[1];
            }
          }

          rowObject[header] = {
            value: value,
            formula: formula,
            fileId: fileId,
            // If it's an image, provide direct access URLs
            imageUrl: fileId
              ? `https://lh3.googleusercontent.com/d/${fileId}`
              : null,
            driveUrl: fileId
              ? `https://drive.google.com/file/d/${fileId}/view`
              : null,
          };
        } else {
          rowObject[header] = value;
        }
      });

      return rowObject;
    });

    const requestIdHeader = headers[requestIdColumnIndex];
    console.log(`Using Request ID column: "${requestIdHeader}"`);

    // Find ALL rows that match the request ID
    const matchingRows = data.filter((row) => {
      const cellValue = String(
        row[requestIdHeader]?.value || row[requestIdHeader] || ""
      ).trim();
      const paramValue = requestId.toString().trim();
      return cellValue === paramValue;
    });

    if (matchingRows.length === 0) {
      // Log some sample data for debugging
      const sampleData = data.slice(0, 3).map((row) => row[requestIdHeader]);
      console.log(
        `No records found with Request ID: ${requestId}. Sample values:`,
        sampleData
      );

      return NextResponse.json(
        {
          error: `No records found with Request ID: ${requestId}`,
          requestIdColumn: requestIdHeader,
          sampleValues: sampleData,
        },
        { status: 404 }
      );
    }

    console.log(
      `Found ${matchingRows.length} rows matching Request ID: ${requestId}`
    );
    return NextResponse.json({
      data: matchingRows,
      count: matchingRows.length,
    });
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch data from Google Sheets",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
