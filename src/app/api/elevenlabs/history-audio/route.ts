import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKeyProfileKey, historyItemId } = await request.json();
    
    // Map profile keys to environment variables
    const API_KEY_MAP: Record<string, string | undefined> = {
      account_1: process.env.ELEVENLABS_KEY_ACCOUNT_1,
      account_2: process.env.ELEVENLABS_KEY_ACCOUNT_2,
      account_3: process.env.ELEVENLABS_KEY_ACCOUNT_3,
      account_4: process.env.ELEVENLABS_KEY_ACCOUNT_4,
      account_5: process.env.ELEVENLABS_KEY_ACCOUNT_5,
      account_6: process.env.ELEVENLABS_KEY_ACCOUNT_6,
    };
    
    const apiKey = API_KEY_MAP[apiKeyProfileKey];
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Invalid API key profile' },
        { status: 400 }
      );
    }
    
    const url = `https://api.elevenlabs.io/v1/history/${historyItemId}/audio`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch history audio: ${response.status}`);
    }

    // Get binary audio data
    const audioArrayBuffer = await response.arrayBuffer();
    
    // Return the audio directly
    return new NextResponse(audioArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: any) {
    console.error('Error fetching history audio from ElevenLabs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch history audio' },
      { status: 500 }
    );
  }
}