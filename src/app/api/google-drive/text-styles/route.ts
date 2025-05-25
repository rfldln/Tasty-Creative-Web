import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
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
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token, refresh_token });

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const folderId = "1Mo3i9lUmfyT5vfgTddPV-PnYbquTEqwL";

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, webViewLink, thumbnailLink)",
    });

    return NextResponse.json({ files: res.data.files || [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Google Drive API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch drive items" },
      { status: 500 }
    );
  }
}
