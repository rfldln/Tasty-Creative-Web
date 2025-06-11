// app/api/comfyui/object-info/route.ts
import { NextRequest, NextResponse } from 'next/server';

const COMFYUI_BASE_URL = process.env.COMFYUI_BASE_URL || 'http://209.53.88.242:12628';

export async function GET() {
  try {
    console.log('Fetching object info from:', `${COMFYUI_BASE_URL}/object_info`);
    
    const response = await fetch(`${COMFYUI_BASE_URL}/object_info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ComfyUI responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('ComfyUI object-info Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to connect to ComfyUI',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}