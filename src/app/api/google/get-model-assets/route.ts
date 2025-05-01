import { google, sheets_v4 } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

interface GoogleAuthTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

const SPREADSHEET_ID = "1LPrht0Aobhs3KiRV0aLjmJ6_AKQ0HmANJohbzEsMEOk";
const SHEETS = ["Live Gen Tracker", "VIP Gen Tracker"];

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const modelName = url.searchParams?.get("model")?.trim();

  console.log("🔍 Model name received:", modelName);

  if (!modelName) {
    return NextResponse.json(
      { error: "Model name is required" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("google_auth_tokens");

  if (!tokensCookie) {
    console.warn("⚠️ No tokens cookie found");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value) as GoogleAuthTokens;
    console.log("🔐 Google tokens:", tokens);

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

    const allMatchingRows: Record<
      "live" | "vip",
      Record<string, string | { value: string; formula: string }>[]
    > = {
      live: [],
      vip: [],
    };

    for (const sheetName of SHEETS) {
      console.log(`📄 Fetching rows from: ${sheetName}`);

      const [valuesResponse, formulasResponse] = await Promise.all([
        sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!A3:Z`, // Includes header row (row 3)
          valueRenderOption: "FORMATTED_VALUE",
        }),
        sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!A3:Z`,
          valueRenderOption: "FORMULA",
        }),
      ]);

      const values = valuesResponse.data.values ?? [];
      const formulas = formulasResponse.data.values ?? [];

      if (values.length === 0) {
        console.log(`⚠️ No data in ${sheetName}`);
        continue;
      }

      const headers = values[0] as string[];
      const dataRows = values.slice(1); // Start from row 4 (data)
      const dataFormulas = formulas.slice(1); // Align with data

      const modelIndex = headers.indexOf("Model");

      if (modelIndex === -1) {
        console.warn(`❌ "Model" column not found in ${sheetName}`);
        continue;
      }

      const rows = dataRows
        .map((row, rowIndex) => {
          const modelCell = row[modelIndex]?.trim();
          if (
            !modelCell ||
            modelCell.toLowerCase() !== modelName.toLowerCase()
          ) {
            return null;
          }

          const rowObj: Record<
            string,
            string | { value: string; formula: string }
          > = {};

          headers.forEach((header, index) => {
            const value = row[index]?.trim() || "";
            const formula = dataFormulas[rowIndex]?.[index] || "";
            rowObj[header] =
              typeof formula === "string" && formula.startsWith("=")
                ? { value, formula }
                : value;
          });

          rowObj["type"] = sheetName.includes("VIP") ? "vip" : "live";
          rowObj["Sheet"] = sheetName;

          return rowObj;
        })
        .filter(Boolean) as Record<
        string,
        string | { value: string; formula: string }
      >[];

      console.log(`✅ Matching rows in ${sheetName}:`, rows.length);

      if (sheetName.includes("Live")) {
        allMatchingRows.live.push(...rows);
      } else if (sheetName.includes("VIP")) {
        allMatchingRows.vip.push(...rows);
      }
    }

    console.log("🧾 Final structured output:", allMatchingRows);
    return NextResponse.json(allMatchingRows, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching model assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch model assets" },
      { status: 500 }
    );
  }
}
