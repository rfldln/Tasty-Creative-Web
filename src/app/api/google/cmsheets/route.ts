import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
// GET endpoint to read client data from the sheet
// GET endpoint to read client data from the sheet
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "ONBOARDING";
    const clientNameFilter = searchParams.get("clientName");
    const includeChatters = searchParams.get("includeChatters") === "true";

    const cookieStore = await cookies();
    const authTokensCookie = cookieStore.get("google_auth_tokens")?.value;

    if (!authTokensCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { access_token, refresh_token } = JSON.parse(
      decodeURIComponent(authTokensCookie)
    );

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://legacy.tastycreative.xyz"
    );
    oauth2Client.setCredentials({ access_token, refresh_token });

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    const spreadsheetId = "1knNrNKtIABQZeGRPoYht5a9R84Wvzo3Q2RuohhrplW4";

    // Use batchGet to get A, H, J columns only
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: [`${tab}!A2:A`, `${tab}!H2:H`, `${tab}!J2:J`],
    });

    const [clientsCol, managersCol, chattersCol] =
      response.data.valueRanges ?? [];

    const rowCount = Math.max(
      clientsCol.values?.length || 0,
      managersCol.values?.length || 0,
      chattersCol.values?.length || 0
    );

    const clients = Array.from({ length: rowCount }, (_, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = {
        clientName: clientsCol.values?.[i]?.[0] || "",
        chattingManagers: managersCol.values?.[i]?.[0] || "",
      };

      if (includeChatters) {
        client.chatters = chattersCol.values?.[i]?.[0] || "";
      }

      return client;
    });

    if (clientNameFilter) {
      const match = clients.find(
        (client) =>
          client.clientName.toLowerCase() === clientNameFilter.toLowerCase()
      );
      return NextResponse.json(match ? [match] : [], { status: 200 });
    }

    return NextResponse.json(clients, { status: 200 });
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from Google Sheet" },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a client's data
// export async function PUT(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { originalClientName, clientName, status, chattingManagers } = body;

//     console.log("PUT: Received payload:", body);

//     if (!originalClientName || !clientName || !status) {
//       console.warn("PUT: Missing required fields.");
//       return NextResponse.json(
//         { error: "Missing required fields" },
//         { status: 400 }
//       );
//     }

//     const cookieStore = await cookies();
//     const authTokensCookie = cookieStore.get("google_auth_tokens")?.value;

//     if (!authTokensCookie) {
//       console.warn("PUT: No auth token found in cookies.");
//       return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
//     }

//     const { access_token, refresh_token } = JSON.parse(
//       decodeURIComponent(authTokensCookie)
//     );
//     console.log("PUT: Access token and refresh token loaded.");

//     const oauth2Client = new google.auth.OAuth2(
//       process.env.GOOGLE_CLIENT_ID,
//       process.env.GOOGLE_CLIENT_SECRET,
//       "https://legacy.tastycreative.xyz"
//     );
//     oauth2Client.setCredentials({ access_token, refresh_token });

//     const sheets = google.sheets({ version: "v4", auth: oauth2Client });

//     const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
//     const tab = "Models";
//     console.log("PUT: Using tab:", tab);

//     const getAllResponse = await sheets.spreadsheets.values.get({
//       spreadsheetId,
//       range: `${tab}!A:C`,
//     });

//     const rows = getAllResponse.data.values;
//     console.log(`PUT: ${rows?.length || 0} rows fetched from spreadsheet.`);

//     if (!rows || rows.length === 0) {
//       return NextResponse.json(
//         { error: "No data found in the sheet" },
//         { status: 404 }
//       );
//     }

//     let rowIndex = -1;
//     for (let i = 1; i < rows.length; i++) {
//       if (rows[i][0] === originalClientName) {
//         rowIndex = i + 1;
//         break;
//       }
//     }

//     if (rowIndex === -1) {
//       console.warn("PUT: Client not found:", originalClientName);
//       return NextResponse.json({ error: "Client not found" }, { status: 404 });
//     }

//     console.log(`PUT: Updating row ${rowIndex} with values:`, {
//       clientName,
//       status,
//       chattingManagers,
//     });

//     await sheets.spreadsheets.values.update({
//       spreadsheetId,
//       range: `${tab}!A${rowIndex}:C${rowIndex}`,
//       valueInputOption: "RAW",
//       requestBody: {
//         values: [[clientName, status, chattingManagers]],
//       },
//     });

//     console.log("PUT: Update successful.");
//     return NextResponse.json(
//       { success: true, message: "Client updated successfully" },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("PUT: Error updating sheet data:", error);
//     return NextResponse.json(
//       { error: "Failed to update data in Google Sheet" },
//       { status: 500 }
//     );
//   }
// }
