import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("google_access_token")?.value;
  const refreshToken = cookieStore.get("google_refresh_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Initialize OAuth2 Client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://legacy.tastycreative.xyz/api/google/callback"
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  try {
    // **Check if access token is expired and refresh if needed**
    const now = Date.now();
    const tokenInfo = await oauth2Client
      .getTokenInfo(accessToken)
      .catch(() => null);

    if (!tokenInfo || (tokenInfo.expiry_date && now > tokenInfo.expiry_date)) {
      if (!refreshToken) {
        return NextResponse.json(
          { error: "Session expired. Please re-authenticate." },
          { status: 401 }
        );
      }

      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      // **Update Access Token Cookie**
      if (credentials.access_token) {
        cookieStore.set("google_access_token", credentials.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: credentials.expiry_date
            ? (credentials.expiry_date - now) / 1000
            : 3600, // 1 hour
          path: "/",
        });
      }
    }

    // **Create Drive client**
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // **Query for image files in Drive**
    const response = await drive.files.list({
      q: "mimeType contains 'image/'",
      fields: "files(id, name, webContentLink, thumbnailLink)",
      spaces: "drive",
      pageSize: 20,
    });

    return NextResponse.json({ files: response.data.files });
  } catch (error) {
    console.error("Error accessing Google Drive:", error);
    return NextResponse.json(
      { error: "Failed to access Google Drive" },
      { status: 500 }
    );
  }
}
