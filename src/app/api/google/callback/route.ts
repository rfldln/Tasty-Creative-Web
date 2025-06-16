import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams?.get("code");
  const state = searchParams?.get("state");

  let tab = "live"; // default tab
  try {
    // Parse the state to retrieve the original tab
    if (state) {
      const parsedState = JSON.parse(state);
      tab = parsedState.tab || "live";
    }
  } catch (error) {
    console.error("Failed to parse state", error);
  }

  if (!code) {
    return NextResponse.json(
      { error: "No authorization code provided" },
      { status: 400 }
    );
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://legacy.tastycreative.xyz/api/google/callback"
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info (name, email)
    const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
    const userInfo = await oauth2.userinfo.get();

    // Create user profile object
    const userProfile = {
      name: userInfo.data.name,
      email: userInfo.data.email,
    };

    // Store tokens in the cookie
    const tokenData = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    // Store user profile in a separate cookie
    const userData = JSON.stringify(userProfile);

    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams?.set("tab", tab);

    const response = NextResponse.redirect(redirectUrl);

    // Set the cookies: one for the tokens and one for the user profile
    response.cookies.set("google_auth_tokens", tokenData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    response.cookies.set("google_user", userData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error getting tokens or user info:", error);
    return NextResponse.json(
      { error: "Failed to get tokens or user info" },
      { status: 500 }
    );
  }
}
