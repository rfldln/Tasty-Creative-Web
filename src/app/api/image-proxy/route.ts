import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("id");
  if (!fileId) {
    return new Response("Missing file ID", { status: 400 });
  }

  const cookieStore = await cookies();
  const authTokensCookie = cookieStore.get("google_auth_tokens")?.value;

  if (!authTokensCookie) {
    return new Response("Not authenticated", { status: 401 });
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

  try {
    const fileRes = await drive.files.get(
      {
        fileId,
        alt: "media",
      },
      { responseType: "stream" }
    );

    const contentType = fileRes.headers["content-type"] ?? "image/jpeg";

    return new Response(fileRes.data as any, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Proxy fetch error:", err);
    return new Response("Failed to proxy image", { status: 500 });
  }
}
