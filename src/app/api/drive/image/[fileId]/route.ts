import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: { fileId: string } }
) {
  console.log('=== DRIVE API ROUTE DEBUG ===');

  const { fileId } = context.params;
  const { searchParams } = new URL(request.url);
  const accessToken = searchParams.get('token');

  console.log('File ID:', fileId);
  console.log('Token present:', !!accessToken);
  console.log('Token preview:', accessToken?.substring(0, 20) + '...');

  if (!accessToken) {
    console.log('ERROR: No access token provided');
    return new NextResponse('Access token required', { status: 401 });
  }

  if (!fileId) {
    console.log('ERROR: No file ID provided');
    return new NextResponse('File ID required', { status: 400 });
  }

  try {
    // First, try to get file metadata to check permissions
    console.log('Checking file permissions...');
    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!metadataResponse.ok) {
      console.error('Metadata fetch failed:', metadataResponse.status, metadataResponse.statusText);
      const errorText = await metadataResponse.text();
      console.error('Error details:', errorText);
      return new NextResponse(`Cannot access file: ${metadataResponse.status}`, {
        status: metadataResponse.status
      });
    }

    const metadata = await metadataResponse.json();
    console.log('File metadata:', metadata);

    // Now fetch the actual image
    console.log('Fetching image data...');
    const imageResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!imageResponse.ok) {
      console.error(`Image fetch failed: ${imageResponse.status} ${imageResponse.statusText}`);
      const errorText = await imageResponse.text();
      console.error('Error details:', errorText);
      return new NextResponse(`Failed to fetch image: ${imageResponse.status}`, {
        status: imageResponse.status
      });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || metadata.mimeType || 'image/jpeg';

    console.log('Image fetched successfully');
    console.log('Content-Type:', contentType);
    console.log('Image size:', imageBuffer.byteLength, 'bytes');

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Content-Length': imageBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('=== DRIVE API ROUTE ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return new NextResponse('Internal server error', { status: 500 });
  }
}
