// app/api/google-drive/download/route.ts
import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId) {
    return NextResponse.json({ error: "File ID is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const authTokensCookie = cookieStore.get("google_auth_tokens")?.value;

  if (!authTokensCookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Parse tokens
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

    // Verify file exists and get metadata
    let fileMeta;
    try {
      const res = await drive.files.get({
        fileId,
        fields:
          "id,name,mimeType,size,capabilities,permissions,shared,sharingUser,owners,trashed",
        supportsAllDrives: true,
      });
      fileMeta = res.data;
      console.log("File metadata:", JSON.stringify(fileMeta, null, 2));
    } catch (metaError) {
      console.error("Metadata error:", metaError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((metaError as any).code === 404) {
        return NextResponse.json(
          { error: "File not found or you don't have permission to access it" },
          { status: 404 }
        );
      }
      throw metaError;
    }

    // Download file content
    try {
      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new NextResponse(response.data as any, {
        headers: {
          "Content-Type": fileMeta.mimeType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            fileMeta.name || "file"
          )}"`,
        },
      });
    } catch (downloadError) {
      console.error("Download error:", downloadError);
      return NextResponse.json(
        { error: "Failed to download file content" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API error:", error);

    // Handle token refresh if needed
    if (
      error instanceof Error &&
      (error.message.includes("invalid_grant") ||
        error.message.includes("token expired"))
    ) {
      return NextResponse.json(
        { error: "Session expired. Please re-authenticate." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}
