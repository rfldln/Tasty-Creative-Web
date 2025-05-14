import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const vaultId = req.nextUrl.searchParams.get("vaultId");

  if (!vaultId) {
    return new Response("Missing 'vaultId' parameter", { status: 400 });
  }

  try {
    const backendUrl = `https://be.tastycreative.xyz/media/vault/${vaultId}`;

    const fetchRes = await fetch(backendUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!fetchRes.ok) {
      return new Response("Failed to fetch media", {
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
    console.error("Vault media proxy error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
