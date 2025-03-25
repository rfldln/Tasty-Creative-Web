import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("google_auth_tokens");

  if (!tokensCookie) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true });
}
