// app/api/google-drive/list/route.ts
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');
  const folderName = searchParams.get('folderName');
  
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('google_auth_tokens');

  if (!tokensCookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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
      expiry_date: tokens.expiry_date
    });

    // Check if token needs refresh
    if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update the cookie with new tokens
      const updatedTokens = JSON.stringify({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || tokens.refresh_token,
        expiry_date: credentials.expiry_date,
      });
      
      cookieStore.set('google_auth_tokens', updatedTokens, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/'
      });
    }

    // Create Drive client
    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client,
    });

    // If no folder ID is provided, list the root folder or the specified base folder
    // You can set this to your shared folder ID to always start there
    const baseRootFolderId = process.env.GOOGLE_DRIVE_BASE_FOLDER_ID || '1wDNFJ_vJ4dn383HafJuuMtcMn4Lzi-RP';
    const queryFolderId = folderId || baseRootFolderId;

    // If searching for a specific model's folder by name
    if (folderName && !folderId) {
      // First, look for the folder with the specified name in the base folder
      const folderQuery = `'${baseRootFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder'`;
      
      const folderResponse = await drive.files.list({
        q: folderQuery,
        fields: 'files(id, name)',
        spaces: 'drive',
      });
      
      if (folderResponse.data.files && folderResponse.data.files.length > 0) {
        // If found the model folder, use its ID
        const modelFolder = folderResponse.data.files[0];
        
        // Now get contents of that folder
        const query = `'${modelFolder.id}' in parents and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder')`;
        
        const response = await drive.files.list({
          q: query,
          fields: 'files(id, name, mimeType, webContentLink, thumbnailLink)',
          spaces: 'drive',
          pageSize: 50,
        });
        
        // Prepare folders and files for the response
        const files = response.data.files?.map(file => ({
          ...file,
          isFolder: file.mimeType === 'application/vnd.google-apps.folder'
        })) || [];
        
        return NextResponse.json({ 
          files,
          currentFolder: { id: modelFolder.id, name: modelFolder.name },
          parentFolder: { id: baseRootFolderId, name: 'Root' }
        });
      }
    }

    // Default query for listing contents of a folder
    const query = `'${queryFolderId}' in parents and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder')`;
    
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, webContentLink, thumbnailLink)',
      spaces: 'drive',
      pageSize: 50,
    });

    // Get folder information for navigation breadcrumbs
    let currentFolder = { id: queryFolderId, name: 'Root' };
    let parentFolder = null;
    
    if (queryFolderId !== baseRootFolderId) {
      try {
        const folderInfo = await drive.files.get({
          fileId: queryFolderId,
          fields: 'id, name, parents'
        });
        
        currentFolder = { 
          id: folderInfo.data.id || queryFolderId, 
          name: folderInfo.data.name || 'Folder' 
        };
        
        // If this folder has a parent, get its info too
        if (folderInfo.data.parents && folderInfo.data.parents.length > 0) {
          const parentId = folderInfo.data.parents[0];
          const parentInfo = await drive.files.get({
            fileId: parentId,
            fields: 'id, name'
          });
          
          parentFolder = { 
            id: parentInfo.data.id || parentId, 
            name: parentInfo.data.name || 'Parent Folder' 
          };
        }
      } catch (error) {
        console.error('Error getting folder information:', error);
      }
    }

    // Prepare folders and files for the response
    const files = response.data.files?.map(file => ({
      ...file,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder'
    })) || [];
    
    return NextResponse.json({ 
      files,
      currentFolder,
      parentFolder
    });
  } catch (error) {
    console.error('Error accessing Google Drive:', error);
    return NextResponse.json({ error: 'Failed to access Google Drive' }, { status: 500 });
  }
}