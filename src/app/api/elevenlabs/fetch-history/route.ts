import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKeyProfileKey, voiceId, pageSize = 20, pageIndex = 1, forceRefresh = false } = await request.json();
    
    // Map profile keys to environment variables
    const API_KEY_MAP: Record<string, string | undefined> = {
      account_1: process.env.ELEVENLABS_KEY_ACCOUNT_1,
      account_2: process.env.ELEVENLABS_KEY_ACCOUNT_2,
      account_3: process.env.ELEVENLABS_KEY_ACCOUNT_3,
      account_4: process.env.ELEVENLABS_KEY_ACCOUNT_4,
      account_5: process.env.ELEVENLABS_KEY_ACCOUNT_5,
      account_6: process.env.ELEVENLABS_KEY_ACCOUNT_6,
      account_7: process.env.ELEVENLABS_KEY_ACCOUNT_7,
      account_8: process.env.ELEVENLABS_KEY_ACCOUNT_8,
      account_9: process.env.ELEVENLABS_KEY_ACCOUNT_9,
    };
    
    const apiKey = API_KEY_MAP[apiKeyProfileKey];
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Invalid API key profile' },
        { status: 400 }
      );
    }
    
    // Fetch history from ElevenLabs API
    const url = `https://api.elevenlabs.io/v1/history?page_size=100`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.status}`);
    }

    const data = await response.json();
    let allHistoryItems = data.history;
    
    // Filter history items for the specific voice ID if provided
    let historyItems = allHistoryItems;
    if (voiceId) {
      historyItems = allHistoryItems.filter((item: any) => item.voice_id === voiceId);
    }

    // Calculate pagination info
    const totalItems = historyItems.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (pageIndex - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    
    // Get the items for the current page
    const paginatedItems = historyItems.slice(startIndex, endIndex);

    return NextResponse.json({
      items: paginatedItems,
      pagination: {
        pageIndex,
        pageSize,
        totalItems,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('Error fetching history from ElevenLabs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch history' },
      { status: 500 }
    );
  }
}