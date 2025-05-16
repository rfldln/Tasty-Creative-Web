import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return new Response("Missing 'email' parameter", { status: 400 });
  }

  try {
    const backendUrl = `https://be.tastycreative.xyz/vaults/tags/${encodeURIComponent(email)}`;

    const fetchRes = await fetch(backendUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!fetchRes.ok) {
      return new Response("Failed to fetch vault tags", {
        status: fetchRes.status,
      });
    }

    const data = await fetchRes.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Vault tags proxy error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
