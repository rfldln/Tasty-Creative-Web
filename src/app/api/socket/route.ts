// app/api/socket/route.ts
import { NextRequest } from "next/server";

import SocketService from "@/lib/socket";

// Ensure our route handler is not cached
export const dynamic = "force-dynamic";

// Define a custom socket handler
const socketHandler = (req: NextRequest, res: NextApiResponseServerIO) => {
  // Get the socket service instance
  const socketService = SocketService.getInstance();

  // Create a new socket.io server if none exists
  if (!socketService.getIO()) {
    console.log("Initializing socket.io server");
    const io = socketService.createIOServer({
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin:
          process.env.NODE_ENV === "production"
            ? ["https://tasty-creative-web.vercel.app"] // Update with your domain
            : ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Add the io instance to the response
    res.socket.server.io = io;
  }

  return new Response("Socket.io server running", { status: 200 });
};

// Export the handler
export async function GET(req: NextRequest) {
  // Due to TypeScript's limitations with Next.js App Router, we need to cast
  const res = {} as NextApiResponseServerIO;
  return socketHandler(req, res);
}
