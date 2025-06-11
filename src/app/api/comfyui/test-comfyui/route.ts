// app/api/comfyui/test-comfyui/route.ts
import { NextRequest, NextResponse } from 'next/server';

const COMFYUI_BASE_URL = process.env.COMFYUI_BASE_URL || 'http://209.53.88.242:12628';

export async function GET() {
  try {
    console.log('Testing connection to:', COMFYUI_BASE_URL);
    
    // Test basic connectivity with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${COMFYUI_BASE_URL}/object_info`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ComfyUI-Client/1.0',
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    const responseText = await response.text();
    let parsedResponse;
    
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      parsedResponse = null;
    }
    
    return NextResponse.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      bodyPreview: responseText.substring(0, 500),
      isParsableJson: parsedResponse !== null,
      timestamp: new Date().toISOString(),
      comfyUIUrl: COMFYUI_BASE_URL,
    });
    
  } catch (error) {
    console.error('ComfyUI connection test failed:', error);
    
    // Detailed error information
    let errorType = 'Unknown';
    let errorDetails = '';
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorType = 'Timeout';
        errorDetails = 'Connection timed out after 10 seconds';
      } else if (error.message.includes('fetch')) {
        errorType = 'Network';
        errorDetails = 'Network request failed - check if ComfyUI is running and accessible';
      } else {
        errorType = error.name;
        errorDetails = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorType,
      errorDetails,
      timestamp: new Date().toISOString(),
      comfyUIUrl: COMFYUI_BASE_URL,
      suggestions: [
        'Check if your RunPod instance is running',
        'Verify the ComfyUI server is started on port 12628',
        'Ensure the IP address is correct and accessible',
        'Check if there are any firewall restrictions',
      ],
    }, { status: 500 });
  }
}