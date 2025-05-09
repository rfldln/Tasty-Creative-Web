import { NextResponse } from "next/server";

const API_KEY = process.env.ONLYFANS_API_KEY; // Ensure you have this in your .env file

export async function GET() {
  try {
    const res = await fetch("https://app.onlyfansapi.com/api/vault/autumren", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch vault media" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Vault fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
