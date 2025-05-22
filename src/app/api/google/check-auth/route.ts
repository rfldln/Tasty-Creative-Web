import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();

  const tokensCookie = cookieStore.get("google_auth_tokens");
  const userCookie = cookieStore.get("google_user");

  // Helper function to validate a cookie
  const isValid = (cookie: ReturnType<typeof cookieStore.get>) =>
    cookie && typeof cookie.value === "string" && cookie.value.trim() !== "";

  if (!isValid(tokensCookie) || !isValid(userCookie)) {
    const response = NextResponse.json({ authenticated: false });

    // Clear invalid cookies
    response.cookies.set("google_auth_tokens", "", { maxAge: 0 });
    response.cookies.set("google_user", "", { maxAge: 0 });

    return response;
  }

  // Optionally, try to parse JSON if you expect JSON in the cookie values
  try {
    if (!tokensCookie || !userCookie) {
      throw new Error("Missing cookies");
    }
    JSON.parse(tokensCookie.value);
    JSON.parse(userCookie.value);
  } catch {
    const response = NextResponse.json({ authenticated: false });

    // Clear invalid JSON cookies
    response.cookies.set("google_auth_tokens", "", { maxAge: 0 });
    response.cookies.set("google_user", "", { maxAge: 0 });

    return response;
  }

  return NextResponse.json({ authenticated: true });
}
