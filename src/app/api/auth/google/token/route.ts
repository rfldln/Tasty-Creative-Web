// app/api/auth/google/token/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, redirect_uri } = await request.json();

    // Debug logging
    console.log('=== TOKEN EXCHANGE DEBUG ===');
    console.log('Request body:', { code: code ? 'present' : 'missing', redirect_uri });
    console.log('Environment check:', {
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'present' : 'missing',
      GOOGLE_CLIENT_SECRET1: process.env.GOOGLE_CLIENT_SECRET1 ? 'present' : 'missing',
      CLIENT_ID_LENGTH: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.length || 0,
      CLIENT_SECRET_LENGTH: process.env.GOOGLE_CLIENT_SECRET1?.length || 0,
    });

    if (!code || !redirect_uri) {
      console.error('Missing required parameters:', { code: !!code, redirect_uri: !!redirect_uri });
      return NextResponse.json(
        { error: 'Missing required parameters', details: { code: !!code, redirect_uri: !!redirect_uri } },
        { status: 400 }
      );
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET1) {
      console.error('Missing environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Google OAuth credentials' },
        { status: 500 }
      );
    }

    const tokenPayload = {
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET1, // Using GOOGLE_CLIENT_SECRET1 as intended
      redirect_uri,
      grant_type: 'authorization_code',
    };

    console.log('Token request payload:', {
      code: code.substring(0, 10) + '...',
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.substring(0, 10) + '...',
      client_secret: '[REDACTED]',
      redirect_uri,
      grant_type: 'authorization_code'
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenPayload),
    });

    const tokenData = await tokenResponse.json();

    console.log('Google response:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      ok: tokenResponse.ok,
      headers: Object.fromEntries(tokenResponse.headers.entries()),
    });

    console.log('Google response data:', tokenData);

    if (!tokenResponse.ok) {
      console.error('=== TOKEN EXCHANGE FAILED ===');
      console.error('Status:', tokenResponse.status);
      console.error('Response:', tokenData);
      
      // Return the exact error from Google
      return NextResponse.json(
        { 
          error: 'Token exchange failed',
          google_error: tokenData,
          status: tokenResponse.status,
          statusText: tokenResponse.statusText
        },
        { status: 400 }
      );
    }

    console.log('=== TOKEN EXCHANGE SUCCESS ===');

    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
    });
  } catch (error) {
    console.error('=== TOKEN ENDPOINT ERROR ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}