// src/app/api/be/client-list/route.ts

export async function GET() {
  const backendUrl = "https://be.tastycreative.xyz/clients/all";

  try {
    const fetchRes = await fetch(backendUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!fetchRes.ok) {
      return new Response("Failed to fetch clients", {
        status: fetchRes.status,
      });
    }

    const data = await fetchRes.json();
    return Response.json(data);
  } catch (err) {
    console.error("Client list proxy error:", err);
    return new Response("Failed to retrieve client list", { status: 500 });
  }
}
