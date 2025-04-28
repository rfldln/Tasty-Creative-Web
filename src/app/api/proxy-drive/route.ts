// src/app/api/proxy-drive/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new NextResponse("Missing file id", { status: 400 });
  }

  const fileUrl = `https://drive.google.com/uc?export=view&id=${id}`;

  try {
    const response = await fetch(fileUrl);

    if (!response.ok) {
      return new NextResponse(`Failed to fetch file: ${response.statusText}`, { status: 500 });
    }

    const blob = await response.blob();
    const contentType = response.headers.get("Content-Type") || "application/octet-stream";

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error fetching from Google Drive:", error);
    return new NextResponse("Error fetching file", { status: 500 });
  }
}
