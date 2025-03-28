import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// Define types
interface FormData {
  model: string;
  date: string;
  time: string;
  timezone: string;
  paid: boolean;
  customImage: boolean;
  imageId: string;
  thumbnail: string;
  webViewLink: string;
}

// Map of common timezone abbreviations to IANA timezone identifiers
const timezoneMap: Record<string, string> = {
  EST: "America/New_York",
  EDT: "America/New_York",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  MST: "America/Denver",
  MDT: "America/Denver",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  GMT: "Europe/London",
  UTC: "Etc/UTC",
};

/**
 * Search for Google Sheet files in a folder and its subfolders
 * @param drive Google Drive API instance
 * @param folderId Parent folder ID to search in
 * @param modelName Model name to search for
 * @param isPaid Whether to search for "Paid" or "Free" in file names
 * @returns Found spreadsheet ID and sheet name, or null if not found
 */
async function findSpreadsheet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drive: any,
  folderId: string,
  modelName: string,
  isPaid: boolean
): Promise<{ spreadsheetId: string; sheetName: string } | null> {
  const sheetMimeType = "application/vnd.google-apps.spreadsheet";
  const paidTerm = isPaid ? "Paid" : "Free";

  try {
    // Search for all spreadsheets in the parent folder and its subfolders
    // Using the 'in' operator to find files in this folder or any subfolder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='${sheetMimeType}'`,
      fields: "files(id, name)",
      spaces: "drive",
      includeItemsFromAllDrives: false,
      supportsAllDrives: false,
    });

    const files = response.data.files || [];

    // First pass: Look for exact match with model name and paid/free status
    for (const file of files) {
      const fileName = file.name.toLowerCase();
      const modelNameLower = modelName.toLowerCase();
      const paidTermLower = paidTerm.toLowerCase();

      // Skip files with OFTV in the name
      if (fileName.includes("oftv") || fileName.includes("OFTV")) {
        console.log(`Skipping spreadsheet with OFTV in name: ${file.name}`);
        continue;
      }

      if (
        fileName.includes(modelNameLower) &&
        fileName.includes(paidTermLower)
      ) {
        return {
          spreadsheetId: file.id,
          sheetName: "Used Captions", // Default sheet name, adjust as needed
        };
      }
    }

    // // Second pass: Look for partial matches or files containing just the model name
    // for (const file of files) {
    //   const fileName = file.name.toLowerCase();
    //   const modelNameLower = modelName.toLowerCase();

    //   // Skip files with OFTV in the name
    //   if (fileName.includes("oftv") || fileName.includes("OFTV")) {
    //     console.log(`Skipping spreadsheet with OFTV in name: ${file.name}`);
    //     continue;
    //   }

    //   if (fileName.includes(modelNameLower)) {
    //     return {
    //       spreadsheetId: file.id,
    //       sheetName: "Used Captions", // Default sheet name, adjust as needed
    //     };
    //   }
    // }

    // If no direct matches found in the parent folder, search in subfolders
    const folderMimeType = "application/vnd.google-apps.folder";
    const foldersResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='${folderMimeType}'`,
      fields: "files(id, name)",
    });

    const folders = foldersResponse.data.files || [];

    // Search each subfolder recursively
    for (const folder of folders) {
      // First check if the subfolder itself matches our criteria

      // Search for spreadsheets in this subfolder
      const result = await searchInFolder(drive, folder.id, modelName, isPaid);
      if (result) return result;

      // If not found, search through any further subfolders
      const result2 = await searchRecursively(
        drive,
        folder.id,
        modelName,
        isPaid
      );
      if (result2) return result2;
    }

    return null;
  } catch (error) {
    console.error("Error searching for spreadsheet:", error);
    return null;
  }
}

/**
 * Search for matching spreadsheets in a specific folder
 */
async function searchInFolder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drive: any,
  folderId: string,
  modelName: string,
  isPaid: boolean
): Promise<{ spreadsheetId: string; sheetName: string } | null> {
  const sheetMimeType = "application/vnd.google-apps.spreadsheet";
  const paidTerm = isPaid ? "Paid" : "Free";

  try {
    // Get all spreadsheets in this folder
    const sheetsResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='${sheetMimeType}'`,
      fields: "files(id, name)",
    });

    const sheets = sheetsResponse.data.files || [];

    // First pass: Look for exact match with model name and paid/free status
    for (const sheet of sheets) {
      const fileName = sheet.name.toLowerCase();
      const modelNameLower = modelName.toLowerCase();
      const paidTermLower = paidTerm.toLowerCase();

      // Skip files with OFTV in the name
      if (fileName.includes("oftv") || fileName.includes("OFTV")) {
        console.log(`Skipping spreadsheet with OFTV in name: ${sheet.name}`);
        continue;
      }

      if (
        fileName.includes(modelNameLower) &&
        fileName.includes(paidTermLower)
      ) {
        return {
          spreadsheetId: sheet.id,
          sheetName: "Used Captions", // Default sheet name
        };
      }
    }

    // // Second pass: Look for just model name in the filename
    // for (const sheet of sheets) {
    //   const fileName = sheet.name.toLowerCase();
    //   const modelNameLower = modelName.toLowerCase();

    //   // Skip files with OFTV in the name
    //   if (fileName.includes("oftv") || fileName.includes("OFTV")) {
    //     console.log(`Skipping spreadsheet with OFTV in name: ${sheet.name}`);
    //     continue;
    //   }

    //   if (fileName.includes(modelNameLower)) {
    //     return {
    //       spreadsheetId: sheet.id,
    //       sheetName: "Used Captions", // Default sheet name
    //     };
    //   }
    // }

    return null;
  } catch (error) {
    console.error(`Error searching folder ${folderId}:`, error);
    return null;
  }
}

/**
 * Recursively search for spreadsheets in folders and subfolders
 */
async function searchRecursively(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drive: any,
  folderId: string,
  modelName: string,
  isPaid: boolean
): Promise<{ spreadsheetId: string; sheetName: string } | null> {
  const folderMimeType = "application/vnd.google-apps.folder";

  try {
    // Get all subfolders
    const subFoldersResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='${folderMimeType}'`,
      fields: "files(id, name)",
    });

    const subFolders = subFoldersResponse.data.files || [];

    // First, search for spreadsheets directly in this folder
    const result = await searchInFolder(drive, folderId, modelName, isPaid);
    console.log(result);
    if (result) return result;

    // Recursively search each subfolder
    for (const subFolder of subFolders) {
      const result = await searchRecursively(
        drive,
        subFolder.id,
        modelName,
        isPaid
      );
      console.log(result, "subfolder");
      if (result) return result;
    }

    return null;
  } catch (error) {
    console.error(`Error searching folder ${folderId}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const tokensCookie = request.cookies.get("google_auth_tokens")?.value;
  if (!tokensCookie) {
    return NextResponse.json(
      { message: "Not authenticated with Google", requireAuth: true },
      { status: 401 }
    );
  }

  let tokens = JSON.parse(tokensCookie) as {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
  };

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);

  const now = Date.now();
  if (!tokens.expiry_date || now > tokens.expiry_date) {
    if (!tokens.refresh_token) {
      return NextResponse.json(
        {
          message: "Session expired. Please re-authenticate.",
          requireAuth: true,
        },
        { status: 401 }
      );
    }

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      tokens = {
        access_token: credentials.access_token || "",
        refresh_token: credentials.refresh_token || tokens.refresh_token,
        expiry_date: credentials.expiry_date!,
      };
      oauth2Client.setCredentials(tokens);

      const response = NextResponse.json({
        message: "Event processing...",
      });
      response.cookies.set("google_auth_tokens", JSON.stringify(tokens), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });
      return response;
    } catch (refreshError) {
      console.error("Error refreshing Google token:", refreshError);
      return NextResponse.json(
        {
          message: "Failed to refresh Google token. Please re-authenticate.",
          requireAuth: true,
        },
        { status: 401 }
      );
    }
  }

  try {
    const formData: FormData = await request.json();

    if (
      !formData.model ||
      !formData.date ||
      !formData.time ||
      !formData.timezone
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // The parent folder ID from your URL
    const parentFolderId = process.env.GOOGLE_DRIVE_SHEET_FOLDER_ID!;

    const ianaTimezone = timezoneMap[formData.timezone] || formData.timezone;
    const [hours, minutes] = formData.time.split(":").map(Number);
    const parsedDate = new Date(formData.date);

    const eventDateTime = new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
      hours,
      minutes
    );
    const endDateTime = new Date(eventDateTime.getTime() + 60 * 60 * 1000);

    let description = `Model: ${formData.model}\n`;
    if (formData.paid) description += "This is a paid session\n";
    if (formData.thumbnail) description += `Thumbnail: ${formData.thumbnail}\n`;
    if (formData.webViewLink)
      description += `WebView Link: ${formData.webViewLink}\n`;

    const event = {
      summary: `TEST - ${formData.model} OF Live`,
      description,
      start: { dateTime: eventDateTime.toISOString(), timeZone: ianaTimezone },
      end: { dateTime: endDateTime.toISOString(), timeZone: ianaTimezone },
      colorId: formData.paid ? "11" : "10",
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    };

    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    try {
      const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: event,
      });

      const calendarSuccess = {
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
      };

      if (!calendarSuccess) {
        return NextResponse.json(
          {
            message: calendarSuccess,
          },
          { status: 404 }
        );
      }

      // Find appropriate spreadsheet based on model and paid status
      const spreadsheetInfo = await findSpreadsheet(
        drive,
        parentFolderId,
        formData.model,
        formData.paid
      );

      console.log(spreadsheetInfo, "spreadsheetInfo");

      if (!spreadsheetInfo && calendarSuccess) {
        // If no specific spreadsheet found, use a default one or return an error
        return NextResponse.json(
          {
            message: `Calendar Event created but could not find appropriate spreadsheet for model ${
              formData.model
            } (${formData.paid ? "Paid" : "Free"})`,
          },
          { status: 404 }
        );
      }

      if (!spreadsheetInfo) {
        return NextResponse.json(
          {
            message: `Could not find appropriate spreadsheet for model ${
              formData.model
            } (${formData.paid ? "Paid" : "Free"})`,
          },
          { status: 404 }
        );
      }
      const { spreadsheetId, sheetName } = spreadsheetInfo;

      try {
        // Append to Google Sheets using the found spreadsheetId
        const headerRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!1:3`, // Fetch first 3 rows
        });

        const headerRows = headerRes.data.values || [];
        let headers: string[] = [];

        // Find the first row that contains the required headers
        for (let i = 0; i < headerRows.length; i++) {
          if (
            headerRows[i].includes("Time (PST)") &&
            headerRows[i].includes("Content/Flyer")
          ) {
            headers = headerRows[i]; // Set the valid header row
            break;
          }
        }

        if (headers.length === 0) {
          throw new Error(
            `Could not find required columns. Headers found: ${JSON.stringify(
              headerRows
            )}`
          );
        }

        const filteredHeaders = headers.map((header, index) =>
          header.trim() ? header.trim().toLowerCase() : `empty_${index}`
        );

        // Find all required column indexes
        const timeColumnIndex = filteredHeaders.indexOf("time (pst)");
        const flyerColumnIndex = filteredHeaders.indexOf("content/flyer");
        const paywallContentIndex = filteredHeaders.indexOf("paywall content");
        const captionIndex = filteredHeaders.indexOf("caption");
        const priceInfoIndex = filteredHeaders.indexOf("price/info");
        const scheduleIndex = filteredHeaders.indexOf("post schedule");

        // Check if required columns exist
        if (timeColumnIndex === -1 || flyerColumnIndex === -1) {
          throw new Error(
            `Could not find required columns. Headers found: ${filteredHeaders.join(
              ", "
            )}`
          );
        }

        // Get the full sheet data to identify section boundaries
        const fullDataRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}`,
        });

        console.log(fullDataRes, "fullDataRes");

        const allRows = fullDataRes.data.values || [];

        // Find the row index where "1 Time Post" section starts
        let oneTimePostStartRow = 0;
        for (let i = 0; i < allRows.length; i++) {
          const row = allRows[i];
          if (row && row.some((cell) => cell === "1 Time Post")) {
            oneTimePostStartRow = i + 1; // Add 1 because we want the row after the header
            break;
          }
        }

        // Find the row index where "Used Post" section starts
        let usedPostStartRow = allRows.length;
        for (let i = oneTimePostStartRow; i < allRows.length; i++) {
          const row = allRows[i];
          if (row && row.some((cell) => cell === "Used Post")) {
            usedPostStartRow = i;
            break;
          }
        }

        // Add this before your batch update operations
        const sheetInfo = await sheets.spreadsheets.get({
          spreadsheetId,
          fields: "sheets.properties",
        });

        const sheetsInfo = sheetInfo.data.sheets || [];
        let actualSheetId = null;

        // Find the sheet with the matching name
        for (const sheet of sheetsInfo) {
          if (sheet.properties?.title === sheetName) {
            actualSheetId = sheet.properties.sheetId;
            break;
          }
        }

        if (actualSheetId === null) {
          console.error(
            `Sheet named "${sheetName}" not found in the spreadsheet`
          );
          throw new Error(
            `Unable to find sheet "${sheetName}" in the spreadsheet`
          );
        }

        // Now use actualSheetId instead of 0 in your batch update requests

        // Create a new row right before the "Used Post" section
        try {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  insertDimension: {
                    range: {
                      sheetId: actualSheetId, // Assuming the first sheet
                      dimension: "ROWS",
                      startIndex: usedPostStartRow, // Position just before "Used Post"
                      endIndex: usedPostStartRow + 1, // Insert 1 row
                    },
                    inheritFromBefore: true, // Inherit formatting from the row above
                  },
                },
              ],
            },
          });
        } catch (error) {
          console.error("Error inserting row:", error);
          // Continue execution even if this fails - we'll try to use an existing row
        }

        const pstTime = [
          "'" +
            new Intl.DateTimeFormat("en-US", {
              timeZone: "America/Los_Angeles",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }).format(eventDateTime),
        ];

        const imageFormula = `=HYPERLINK("${formData.webViewLink}", IMAGE("${formData.thumbnail}"))`;

        // Create an array for the row values (fill with empty strings for columns we don't have data for)
        const rowValues = Array(
          Math.max(
            timeColumnIndex,
            flyerColumnIndex,
            scheduleIndex !== -1 ? scheduleIndex : 0,
            paywallContentIndex !== -1 ? paywallContentIndex : 0,
            captionIndex !== -1 ? captionIndex : 0,
            priceInfoIndex !== -1 ? priceInfoIndex : 0
          ) + 1
        ).fill("");

        // Populate with our data
        rowValues[timeColumnIndex] = pstTime[0];
        rowValues[flyerColumnIndex] = imageFormula;

        // Set Post Schedule to "LIVE"
        if (scheduleIndex !== -1) {
          rowValues[scheduleIndex] = "TEST - LIVE";
        }

        // The row where we'll add our new data - right before the Used Post section
        const targetRow = usedPostStartRow + 1; // +1 because sheet rows are 1-indexed and we inserted a row

        try {
          // Update the values in the target row
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A${targetRow}`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: [rowValues],
            },
          });
        } catch (error) {
          console.error("Error updating values:", error);
          throw error; // This is critical, so we'll throw the error if it fails
        }

        try {
          // Define the range for all cells to be highlighted
          const columnsToFormat = [
            timeColumnIndex,
            flyerColumnIndex,
            paywallContentIndex,
            captionIndex,
            priceInfoIndex,
            scheduleIndex,
          ].filter((index) => index !== -1);

          const lastColumnIndex = Math.max(...columnsToFormat);
          const firstColumnIndex = Math.min(...columnsToFormat);

          // Now format the row with yellow background
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  updateCells: {
                    range: {
                      sheetId: actualSheetId,
                      startRowIndex: targetRow - 1, // 0-indexed in API
                      endRowIndex: targetRow,
                      startColumnIndex: firstColumnIndex,
                      endColumnIndex: lastColumnIndex + 1,
                    },
                    rows: [
                      {
                        values: columnsToFormat.map(() => ({
                          userEnteredFormat: {
                            backgroundColor: {
                              red: 1.0,
                              green: 1.0,
                              blue: 0.0,
                            },
                          },
                        })),
                      },
                    ],
                    fields: "userEnteredFormat.backgroundColor",
                  },
                },
              ],
            },
          });
        } catch (error) {
          console.error("Error highlighting cells:", error);
          // Continue execution even if highlighting fails
        }

        const generateSpreadsheetLink = (
          spreadsheetId: string,
          sheetName: string,
          rowNumber: number,
          actualSheetId: number
        ) => {
          // Construct the URL with the specific sheet gid
          return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${actualSheetId}&range=${rowNumber}:${rowNumber}`;
        };

        // In your response, use this function
        return NextResponse.json({
          message: "Event created and logged in Google Sheets",
          eventId: response.data.id,
          eventLink: response.data.htmlLink,
          spreadsheetId,
          sheetName,
          spreadsheetLink: generateSpreadsheetLink(
            spreadsheetId,
            sheetName,
            targetRow,
            actualSheetId ?? 0 // Pass the actualSheetId here, defaulting to 0 if undefined
          ),
        });
      } catch (sheetsError) {
        console.error("Error updating spreadsheet:", sheetsError);
        // Return partial success - calendar worked but sheets failed
        return NextResponse.json(
          {
            message:
              "Event created on calendar but failed to update spreadsheet",
            eventId: calendarSuccess.eventId,
            eventLink: calendarSuccess.eventLink,
            spreadsheetError:
              sheetsError instanceof Error
                ? sheetsError.message
                : "Unknown error",
          },
          { status: 207 }
        ); // 207 Multi-Status
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (calendarError: any) {
      if (calendarError.code === 401) {
        return NextResponse.json(
          { message: "Authentication expired", requireAuth: true },
          { status: 401 }
        );
      }
      console.error("Google Calendar API error:", calendarError);
      return NextResponse.json(
        {
          message: `Error creating calendar event: ${calendarError.message}`,
          error: calendarError.message,
        },
        { status: 500 }
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { message: "Failed to process request", error: error.message },
      { status: 500 }
    );
  }
}
