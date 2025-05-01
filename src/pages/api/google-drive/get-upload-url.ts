import { google } from "googleapis";
import { NextApiRequest, NextApiResponse } from "next";
import { parseCookies } from "nookies";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cookies = parseCookies({ req });
  const authTokensCookie = cookies.google_auth_tokens;

  if (!authTokensCookie) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { model, fileType } = req.body;

    if (!model || !fileType) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Convert model name if needed
    let modelName = model;
    if (modelName === "Victoria (V)") {
      modelName = "V";
    } else if (modelName === "Tita") {
      modelName = "Tita Sahara";
    }

    // Determine mime type based on fileType
    let mimeType = "image/jpeg";
    let fileExtension = ".jpg";
    if (fileType === "gif") {
      mimeType = "image/gif";
      fileExtension = ".gif";
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
    const parentFolderId = "1DtsejmJr3k-1ToMgQ1DLgfe3EA36gbMb";

    // 1. Find model folder
    const modelFolder = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${modelName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
    });

    if (!modelFolder.data.files?.length) {
      return res.status(404).json({ error: "Model folder not found" });
    }

    const modelFolderId = modelFolder.data.files[0].id;

    // 2. Find 'For Approval✅' subfolder
    const approvalFolder = await drive.files.list({
      q: `'${modelFolderId}' in parents and name = 'For Approval✅' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
    });

    if (!approvalFolder.data.files?.length) {
      return res.status(404).json({ error: "'For Approval✅' folder not found" });
    }

    const approvalFolderId = approvalFolder.data.files[0].id;

    // Create a placeholder file
    const fileName = `${modelName}_collage${fileExtension}`;
    const fileMetadata = {
      name: fileName,
      parents: approvalFolderId ? [approvalFolderId] : [],
      mimeType: mimeType,
    };

    // Create the file first (this creates a placeholder)
    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id'
    });

    const fileId = file.data.id;

    // Create a resumable upload URL
    const res2 = await drive.files.get({
      fileId: fileId as string,
      fields: 'id,name,webViewLink'
    });

    // Generate a resumable upload URL
    const uploadUrl = await new Promise((resolve, reject) => {
      oauth2Client.getRequestHeaders()
        .then(headers => {
          // Prepare the URL for creating a resumable upload session
          const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=resumable`;
          
          // Set up the HTTP request to create a resumable upload session
          fetch(url, {
            method: 'PATCH',
            headers: {
              'Authorization': headers.Authorization,
              'Content-Type': 'application/json',
              'X-Upload-Content-Type': mimeType,
            },
            body: JSON.stringify({ name: fileName })
          })
          .then(response => {
            if (response.status === 200) {
              // The 'Location' header contains the resumable upload URL
              const location = response.headers.get('Location');
              if (location) {
                resolve(location);
              } else {
                reject(new Error('No upload URL in response'));
              }
            } else {
              reject(new Error(`Failed to create resumable upload session: ${response.status}`));
            }
          })
          .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });

    return res.status(200).json({ 
      success: true, 
      fileId: fileId,
      uploadUrl: uploadUrl,
      webViewLink: res2.data.webViewLink,
      fileName: fileName
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}