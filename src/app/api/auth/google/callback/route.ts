// app/api/auth/google/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Get the base URL from the request
  const baseUrl = request.nextUrl.origin;

  if (error) {
    // Redirect to dataset tab with error
    return NextResponse.redirect(`${baseUrl}/?tab=imagegen&subtab=dataset&error=auth_failed`);
  }

  if (code) {
    // Redirect to dataset tab with the auth code
    return NextResponse.redirect(`${baseUrl}/?tab=imagegen&subtab=dataset&code=${code}`);
  }

  // Default redirect to dataset tab
  return NextResponse.redirect(`${baseUrl}/?tab=imagegen&subtab=dataset`);
}