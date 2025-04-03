import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  console.log("Received request:", request.nextUrl.toString());

  const searchParams = request.nextUrl.searchParams;
  const folderId =
    searchParams.get("folderId") || process.env.GOOGLE_DRIVE_BASE_FOLDER_ID!;
  const modelName = searchParams.get("folderName");

  console.log("Search Params - folderId:", folderId, "modelName:", modelName);

  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("google_auth_tokens");

  if (!tokensCookie) {
    console.log("Authentication error: No tokens found in cookies.");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);
    console.log("Parsed tokens:", tokens);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    console.log("OAuth2 client set up successfully.");

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Get current folder details
    const currentFolderResponse = await drive.files.get({
      fileId: folderId,
      fields: "id, name, parents, mimeType, createdTime, modifiedTime",
      supportsAllDrives: true,
    });

    const currentFolder = {
      id: currentFolderResponse.data.id,
      name: currentFolderResponse.data.name,
      mimeType: currentFolderResponse.data.mimeType,
      parents: currentFolderResponse.data.parents,
      createdAt: currentFolderResponse.data.createdTime,
      modifiedAt: currentFolderResponse.data.modifiedTime,
    };

    console.log("Current folder details:", currentFolder);

    // If modelName is provided, search for it within current folder
    let targetFolder = currentFolder;
    if (modelName && modelName !== currentFolder.name) {
      console.log(`Searching for folder "${modelName}" inside "${currentFolder.name}"`);

      const searchResponse = await drive.files.list({
        q: `name = '${modelName}' and '${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
        spaces: "drive",
        fields: "files(id, name, parents, mimeType)",
        pageSize: 10,
        corpora: "user",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      const matchingFolders = searchResponse.data.files || [];
      console.log("Matching folders found:", matchingFolders);

      if (matchingFolders.length === 0) {
        console.log(`No folder found matching "${modelName}" in the current folder.`);
        return NextResponse.json(
          { error: `No folder found matching "${modelName}" in current folder`, currentFolder },
          { status: 404 }
        );
      }

      targetFolder = {
        id: matchingFolders[0].id,
        name: matchingFolders[0].name,
        mimeType: matchingFolders[0].mimeType,
        parents: matchingFolders[0].parents,
        createdAt: null, // Set to null or fetch if available
        modifiedAt: null, // Set to null or fetch if available
      };

      // Check if "Vault New - Autumn" exists inside the target folder
      const vaultNewSearchResponse = await drive.files.list({
        q: `name = 'Vault New - Autumn' and '${targetFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
        spaces: "drive",
        fields: "files(id, name, parents, mimeType)",
        pageSize: 1,
        corpora: "user",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      const vaultNewFolder = vaultNewSearchResponse.data.files?.[0];

      if (vaultNewFolder) {
        console.log("Automatically navigating to Vault New - Autumn");
        targetFolder = {
          id: vaultNewFolder.id,
          name: vaultNewFolder.name,
          mimeType: vaultNewFolder.mimeType,
          parents: vaultNewFolder.parents,
          createdAt: null, // Set to null or fetch if available
          modifiedAt: null, // Set to null or fetch if available
        };

        // Check if "Wall Posts" exists inside the Vault New - Autumn folder
        const wallPostsSearchResponse = await drive.files.list({
          q: `name = 'Wall Posts' and '${targetFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
          spaces: "drive",
          fields: "files(id, name, parents, mimeType)",
          pageSize: 1,
          corpora: "user",
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
        });

        const wallPostsFolder = wallPostsSearchResponse.data.files?.[0];

        if (wallPostsFolder) {
          console.log("Automatically navigating to Wall Posts");
          targetFolder = {
            id: wallPostsFolder.id,
            name: wallPostsFolder.name,
            mimeType: wallPostsFolder.mimeType,
            parents: wallPostsFolder.parents,
            createdAt: null, // Set to null or fetch if available
            modifiedAt: null, // Set to null or fetch if available
          };
        }
      }
    }

    console.log("Target folder details:", targetFolder);

    // List contents of the target folder
    const listResponse = await drive.files.list({
      q: `'${targetFolder.id}' in parents and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder')`,
      spaces: "drive",
      fields:
        "files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, thumbnailLink)",
      pageSize: 1000,
      corpora: "user",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      orderBy: "folder,name",
    });

    const files = (listResponse.data.files || []).map((file) => ({
      id: file.id!,
      name: file.name!,
      isFolder: file.mimeType === "application/vnd.google-apps.folder",
      size: file.size ? parseInt(file.size) : null,
      createdAt: file.createdTime,
      modifiedAt: file.modifiedTime,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      thumbnailLink: file.thumbnailLink,
      parents: file.parents,
    }));

    console.log("Files in folder:", files);

    return NextResponse.json({
      files,
      currentFolder: {
        id: currentFolder.id,
        name: currentFolder.name,
        parents: currentFolder.parents,
      },
      parentFolder: targetFolder.parents?.[0]
        ? {
            id: targetFolder.parents[0],
            name: "Parent Folder",
          }
        : null,
    });
  } catch (error) {
    console.error("Google Drive API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve files",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}