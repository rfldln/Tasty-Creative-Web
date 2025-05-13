// src/app/api/be/proxy/route.ts
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const encodedPath = req.nextUrl.searchParams.get("path");

  if (!encodedPath) {
    return new Response("Missing 'path' parameter", { status: 400 });
  }

  try {
    const decodedPath = atob(encodedPath);
    const backendUrl = `https://be.tastycreative.xyz/media-viewer/stream?path=${encodeURIComponent(decodedPath)}`;

    const fetchRes = await fetch(backendUrl, {
      headers: {
        Range: req.headers.get("range") || "",
      },
    });

    const headers = new Headers(fetchRes.headers);
    return new Response(fetchRes.body, {
      status: fetchRes.status,
      headers,
    });
  } catch (err) {
    console.error("Proxy error:", err);
    return new Response("Failed to stream media", { status: 500 });
  }
}
