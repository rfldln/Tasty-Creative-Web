import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const folderId = searchParams.get('folderId') || process.env.GOOGLE_DRIVE_BASE_FOLDER_ID!; // Default parent folder
  const folderName = searchParams.get('folderName'); // Optional folder name to search

  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("google_auth_tokens");

  if (!tokensCookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);

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

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Get current folder details
    const currentFolderResponse = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, parents, mimeType, createdTime, modifiedTime',
      supportsAllDrives: true
    });

    const currentFolder = {
      id: currentFolderResponse.data.id,
      name: currentFolderResponse.data.name,
      mimeType: currentFolderResponse.data.mimeType,
      parents: currentFolderResponse.data.parents,
      createdAt: currentFolderResponse.data.createdTime,
      modifiedAt: currentFolderResponse.data.modifiedTime
    };

    // If folderName is provided, search for it within current folder
    let targetFolder = currentFolder;
    if (folderName && folderName !== currentFolder.name) {
      const searchResponse = await drive.files.list({
        q: `name = '${folderName}' and '${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
        spaces: 'drive',
        fields: 'files(id, name, parents, mimeType)',
        pageSize: 1,
        corpora: 'user',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true
      });

      const matchingFolders = searchResponse.data.files || [];
      
      if (matchingFolders.length === 0) {
        return NextResponse.json({ 
          error: `No folder found matching "${folderName}" in current folder`,
          currentFolder
        }, { status: 404 });
      }

      targetFolder = {
        id: matchingFolders[0].id!,
        name: matchingFolders[0].name!,
        mimeType: matchingFolders[0].mimeType!,
        parents: matchingFolders[0].parents,
        createdAt: null,
        modifiedAt: null
      };
    }

    // List contents of the target folder
    const listResponse = await drive.files.list({
      q: `'${targetFolder.id}' in parents`,
      spaces: 'drive',
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, thumbnailLink)',
      pageSize: 1000,
      corpora: 'user',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      orderBy: 'folder,name'
    });

    const files = (listResponse.data.files || []).map(file => ({
      id: file.id!,
      name: file.name!,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      size: file.size ? parseInt(file.size) : null,
      createdAt: file.createdTime,
      modifiedAt: file.modifiedTime,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      thumbnailLink: file.thumbnailLink,
      parents: file.parents
    }));

    return NextResponse.json({
      files,
      currentFolder: {
        id: currentFolder.id,
        name: currentFolder.name,
        parents: currentFolder.parents
      },
      parentFolder: targetFolder.parents?.[0] ? {
        id: targetFolder.parents[0],
        name: 'Parent Folder' // Name will be fetched when navigating up
      } : null
    });

  } catch (error) {
    console.error('Google Drive API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve files', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}