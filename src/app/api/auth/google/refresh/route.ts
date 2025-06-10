import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json({ error: 'Missing refresh token' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET1;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Missing Google OAuth credentials' }, { status: 500 });
    }

    // Refresh the access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Google token refresh failed:', errorData);
      return NextResponse.json({ 
        error: 'Failed to refresh token',
        details: errorData 
      }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    
    return NextResponse.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}