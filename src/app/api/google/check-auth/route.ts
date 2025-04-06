import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("google_auth_tokens");
  const userCookie = cookieStore.get("google_user");

  if (!tokensCookie || !userCookie) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true });
}
