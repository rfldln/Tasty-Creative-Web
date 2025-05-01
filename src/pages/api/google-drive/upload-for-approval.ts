import { google } from "googleapis";
import { NextApiRequest, NextApiResponse } from "next";
import { parseCookies } from "nookies";
import * as formidableLib from "formidable";
import fs from "fs";

// Disable the default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cookies = parseCookies({ req });
  const authTokensCookie = cookies.google_auth_tokens;

  if (!authTokensCookie) {
    return res.status(401).json({ error: "Not authenticated" });
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

  // Parse form data
  const form = formidableLib.default({
    maxFileSize: 100 * 1024 * 1024, // 100MB limit
    keepExtensions: true,
  });
  
  return new Promise((resolve) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.status(500).json({ error: "Failed to parse form" });
        return resolve(true);
      }
      
      try {
        let model = Array.isArray(fields.model) ? fields.model[0] : fields.model || "";

        if (model === "Victoria (V)") {
          model = "V";
        } else if (model === "Tita") {
          model = "Tita Sahara";
        }

        const image = Array.isArray(files.image) ? files.image[0] : files.image;
        const gif = Array.isArray(files.gif) ? files.gif[0] : files.gif;

        const parentFolderId = "1DtsejmJr3k-1ToMgQ1DLgfe3EA36gbMb";

        // 1. Find model folder
        const modelFolder = await drive.files.list({
          q: `'${parentFolderId}' in parents and name = '${model}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: "files(id, name)",
        });

        if (!modelFolder.data.files?.length) {
          res.status(404).json({ error: "Model folder not found" });
          return resolve(true);
        }

        const modelFolderId = modelFolder.data.files[0].id;

        // 2. Find 'For Approval✅' subfolder
        const approvalFolder = await drive.files.list({
          q: `'${modelFolderId}' in parents and name = 'For Approval✅' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: "files(id, name)",
        });

        if (!approvalFolder.data.files?.length) {
          res.status(404).json({ error: "'For Approval✅' folder not found" });
          return resolve(true);
        }

        const approvalFolderId = approvalFolder.data.files[0].id;

        const responses = [];

        // 3. Upload image
        if (image) {
          const stream = fs.createReadStream(image.filepath);

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
          const stream = fs.createReadStream(gif.filepath);

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

        res.status(200).json({ success: true, uploads: responses });
        return resolve(true);
      } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Upload failed" });
        return resolve(true);
      }
    });
  });
}