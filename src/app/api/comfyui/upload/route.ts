// app/api/comfyui/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';

const COMFYUI_BASE_URL = process.env.COMFYUI_BASE_URL || 'http://209.53.88.242:12628';

export async function POST(request: NextRequest) {
  try {
    console.log('Uploading image to ComfyUI...');
    
    // Get the form data from the request
    const formData = await request.formData();
    
    // Forward the form data to ComfyUI
    const response = await fetch(`${COMFYUI_BASE_URL}/upload/image`, {
      method: 'POST',
      body: formData, // Forward the FormData directly
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ComfyUI upload error:', errorText);
      throw new Error(`ComfyUI responded with status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Upload successful:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('ComfyUI Upload Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload to ComfyUI',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}