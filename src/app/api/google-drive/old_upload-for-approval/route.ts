import { google } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Readable } from "stream";

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
    "https://legacy.tastycreative.xyz/api/google/callback"
  );
  oauth2Client.setCredentials({ access_token, refresh_token });

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const formData = await req.formData();
  let model = formData.get("model") as string;

  if (model === "Victoria (V)") {
    model = "V";
  } else if (model === "Tita") {
    model = "Tita Sahara";
  }

  const image = formData.get("image") as File | null;
  const gif = formData.get("gif") as File | null;

  const parentFolderId = "1DtsejmJr3k-1ToMgQ1DLgfe3EA36gbMb";

  try {
    // 1. Find model folder
    const modelFolder = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${model}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
    });

    if (!modelFolder.data.files?.length) {
      return NextResponse.json(
        { error: "Model folder not found" },
        { status: 404 }
      );
    }

    const modelFolderId = modelFolder.data.files?.[0]?.id;

    // 2. Find 'For Approval✅' subfolder
    const approvalFolder = await drive.files.list({
      q: `'${modelFolderId}' in parents and name = 'For Approval✅' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
    });

    if (!approvalFolder.data.files?.length) {
      return NextResponse.json(
        { error: "'For Approval✅' folder not found" },
        { status: 404 }
      );
    }

    const approvalFolderId = approvalFolder.data.files?.[0]?.id;

    const responses = [];

    // 3. Upload image
    if (image) {
      const stream = Readable.from(Buffer.from(await image.arrayBuffer()));

      const imageUpload = await drive.files.create({
        requestBody: {
          name: `${model}_collage.jpg`,
          mimeType: "image/jpeg",
          parents: approvalFolderId ? [approvalFolderId] : [],
        },
        media: {
          mimeType: "image/jpeg",
          body: stream,
        },
      });

      // Get file link after upload
      const imageLinkResponse = await drive.files.get({
        fileId: imageUpload.data.id ?? "",
        fields: "webViewLink", // or "webContentLink" for media file
      });

      responses.push({
        type: "image",
        id: imageUpload.data.id,
        link: imageLinkResponse.data.webViewLink, // Return the link
      });
    }

    // 4. Upload gif
    if (gif) {
      const stream = Readable.from(Buffer.from(await gif.arrayBuffer()));

      const gifUpload = await drive.files.create({
        requestBody: {
          name: `${model}_collage.gif`,
          mimeType: "image/gif",
          parents: approvalFolderId ? [approvalFolderId] : [],
        },
        media: {
          mimeType: "image/gif",
          body: stream,
        },
      });

      // Get file link after upload
      const gifLink = await drive.files.get({
        fileId: gifUpload.data.id ?? "",
        fields: "webViewLink", // or "webContentLink" for media file
      });

      responses.push({
        type: "gif",
        id: gifUpload.data.id,
        link: gifLink.data.webViewLink, // Return the link
      });
    }

    return NextResponse.json({ success: true, uploads: responses });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
