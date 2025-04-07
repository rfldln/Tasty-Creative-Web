/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import heicConvert from "heic-convert";

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

    const { data: fileMeta } = await drive.files.get({
      fileId,
      fields: "id,name,mimeType",
      supportsAllDrives: true,
    });

    const mimeType = fileMeta.mimeType || "application/octet-stream";
    const isHEIC = mimeType === "image/heic" || mimeType === "image/heif";

    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    if (isHEIC) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.data) {
        chunks.push(chunk);
      }

      const inputBuffer = Buffer.concat(chunks);

      const outputBuffer = await heicConvert({
        buffer: inputBuffer as unknown as ArrayBuffer,
        format: "JPEG",
        quality: 0.9,
      });
      

      return new NextResponse(outputBuffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            (fileMeta.name || "file").replace(/\.\w+$/, ".jpg")
          )}"`,
        },
      });
    }

    // Non-HEIC: return as-is
    return new NextResponse(response.data as any, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          fileMeta.name || "file"
        )}"`,
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}
