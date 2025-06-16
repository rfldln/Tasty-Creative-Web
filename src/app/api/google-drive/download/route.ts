/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import heicConvert from "heic-convert";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams?.get("id");
  const skipConversion = searchParams?.get("skipConversion") === "true";

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
      "https://legacy.tastycreative.xyz/api/google/callback"
    );

    oauth2Client.setCredentials({ access_token, refresh_token });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const { data: fileMeta } = await drive.files.get({
      fileId,
      fields: "id,name,mimeType,size",
      supportsAllDrives: true,
    });

    console.log(
      `Processing file: ${fileMeta.name}, Type: ${fileMeta.mimeType}, Size: ${fileMeta.size}`
    );

    const mimeType = fileMeta.mimeType || "application/octet-stream";
    const fileName = fileMeta.name || "file";

    // Check if the file is a HEIC image
    const isHEIC = mimeType === "image/heic" || mimeType === "image/heif";

    // Check if the file is a video
    const isVideo =
      mimeType.startsWith("video/") ||
      fileName.toLowerCase().endsWith(".mov") ||
      fileName.toLowerCase().endsWith(".mp4") ||
      fileName.toLowerCase().endsWith(".avi") ||
      fileName.toLowerCase().endsWith(".wmv");

    // Get appropriate content-disposition type based on file type
    const dispositionType = isVideo ? "inline" : "attachment";

    // For video files or when conversion is explicitly skipped, stream directly without processing
    if (isVideo || skipConversion) {
      console.log(`Streaming file directly: ${fileName} (${mimeType})`);

      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      return new NextResponse(response.data as any, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(
            fileName
          )}"`,
          // Add headers to support video streaming
          ...(isVideo
            ? {
                "Accept-Ranges": "bytes",
              }
            : {}),
        },
      });
    }

    // For HEIC images that need conversion
    if (isHEIC) {
      console.log(`Converting HEIC image: ${fileName}`);

      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

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

      const newFileName = fileName.replace(/\.\w+$/, ".jpg");
      console.log(`Converted to JPEG: ${newFileName}`);

      return new NextResponse(outputBuffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            newFileName
          )}"`,
        },
      });
    }

    // Other image types: return as-is
    console.log(`Downloading regular file: ${fileName} (${mimeType})`);

    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    return new NextResponse(response.data as any, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          fileName
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
