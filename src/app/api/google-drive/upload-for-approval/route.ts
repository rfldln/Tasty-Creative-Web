import { google } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Readable } from "stream"; // ✅ Add this import

export async function POST(req: Request) {
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

  const formData = await req.json();
  const { model, imageBase64, videoBase64 } = formData; // ✅ added videoBase64

  const parentFolderId = "1DtsejmJr3k-1ToMgQ1DLgfe3EA36gbMb";

  try {
    // 1. Find model folder inside parent folder
    const modelFolder = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${model}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
    });

    if (modelFolder.data.files?.length === 0) {
      return NextResponse.json({ error: "Model folder not found" }, { status: 404 });
    }

    const modelFolderId = modelFolder.data.files?.[0]?.id ?? null;

    if (!modelFolderId) {
      return NextResponse.json({ error: "Model folder ID not found" }, { status: 404 });
    }

    // 2. Find 'For Approval✅' folder inside model folder
    const approvalFolder = await drive.files.list({
      q: `'${modelFolderId}' in parents and name = 'For Approval✅' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
    });

    if (approvalFolder.data.files?.length === 0) {
      return NextResponse.json({ error: "'For Approval✅' folder not found" }, { status: 404 });
    }

    const approvalFolderId = approvalFolder.data.files?.[0]?.id ?? null;

    if (!approvalFolderId) {
      return NextResponse.json({ error: "'For Approval✅' folder ID not found" }, { status: 404 });
    }

    const responses = [];

    // 3. Upload image if exists
    if (imageBase64) {
      const buffer = Buffer.from(imageBase64.split(",")[1], "base64");
      const stream = Readable.from(buffer);

      const imageUpload = await drive.files.create({
        requestBody: {
          name: `${model}_collage.jpg`,
          mimeType: "image/jpeg",
          parents: [approvalFolderId],
        },
        media: {
          mimeType: "image/jpeg",
          body: stream,
        },
      });
      responses.push({ type: "image", id: imageUpload.data.id });
    }

    // 4. Upload video if exists
    if (videoBase64) {
      const buffer = Buffer.from(videoBase64.split(",")[1], "base64");
      const stream = Readable.from(buffer);

      const videoUpload = await drive.files.create({
        requestBody: {
          name: `${model}_collage_video.mp4`,
          mimeType: "video/mp4",
          parents: [approvalFolderId],
        },
        media: {
          mimeType: "video/mp4",
          body: stream,
        },
      });
      responses.push({ type: "video", id: videoUpload.data.id });
    }

    return NextResponse.json({ success: true, uploads: responses });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
