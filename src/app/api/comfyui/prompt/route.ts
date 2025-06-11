// app/api/comfyui/prompt/route.ts
import { NextRequest, NextResponse } from 'next/server';

const COMFYUI_BASE_URL = process.env.COMFYUI_BASE_URL || 'http://209.53.88.242:12628';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Sending prompt to ComfyUI:', `${COMFYUI_BASE_URL}/prompt`);
    
    const response = await fetch(`${COMFYUI_BASE_URL}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ComfyUI prompt error:', errorText);
      throw new Error(`ComfyUI responded with status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('ComfyUI Prompt Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to submit prompt to ComfyUI',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}