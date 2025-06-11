// app/api/comfyui/view/route.ts
import { NextRequest, NextResponse } from 'next/server';

const COMFYUI_BASE_URL = process.env.COMFYUI_BASE_URL || 'http://209.53.88.242:12628';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const subfolder = searchParams.get('subfolder') || '';
    const type = searchParams.get('type') || 'output';

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    console.log('Fetching file from ComfyUI:', { filename, subfolder, type });

    // Build the URL for ComfyUI
    const url = new URL('/view', COMFYUI_BASE_URL);
    url.searchParams.append('filename', filename);
    if (subfolder) url.searchParams.append('subfolder', subfolder);
    url.searchParams.append('type', type);

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`ComfyUI responded with status: ${response.status}`);
    }

    // Get the content type from ComfyUI response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Get the file content as ArrayBuffer
    const buffer = await response.arrayBuffer();
    
    // Create a new response with the file content
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error('ComfyUI View Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve file from ComfyUI',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}