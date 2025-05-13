// src/app/media-viewer/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { local_url } = body;

    if (!local_url || typeof local_url !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing "local_url"' },
        { status: 400 }
      );
    }

    // You can add logic here to validate, transform, or process the file path
    console.log('Received local_url:', local_url);

    return NextResponse.json({ message: 'URL received successfully', local_url });
  } catch (error) {
    console.error('Error in /media-viewer:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
