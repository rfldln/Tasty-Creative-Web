import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cookieStore = await cookies();
  const authTokensCookie = cookieStore.get("google_auth_tokens")?.value;
  const type = searchParams?.get("type");

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

  let folderId = null;

  if (type === "LIVE") {
    folderId = "1ykoRn82LsLjah0CXG346LInKV6rk03Ji";
  }
  if (type === "BOTTOM") {
    folderId = "1LRY3Yv6yw2QeYqxY1tAVqcZW-Awa5FAD";
  }
  if (type === "LEFT") {
    folderId = "1G-kCkeG2XyL-elcC7T-U7CVIV6rGWOIN";
  }
  if (type === "RIGHT") {
    folderId = "1ydbCAULvx05RdkRSzhU8FzTi0wbJ9ddv";
  }

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
