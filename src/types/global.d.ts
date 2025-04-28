/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server as SocketIOServer } from "socket.io";
import { Server as NetServer } from "http";
import { NextApiResponse } from "next";

declare global {
  interface NotificationData {
    message: string;
    timestamp: string;
    editedBy: string;
    editedData: {
      [key: string]: string; // Assuming editedData contains key-value pairs where keys are strings and values are strings
    };
    model: string;
    row: string;
    sheet: string;
  }

  interface NotificationPayload {
    message: string;
    data?: Record<string, any>;
  }

  interface SocketResponse {
    success: boolean;
    notification?: NotificationData;
    error?: string;
  }

  interface NextApiResponseServerIO extends NextApiResponse {
    socket: {
      server: NetServer & {
        io: SocketIOServer;
      };
    };
  }

  interface GoogleSheetNotification {
    message: string;
    data?: {
      category?: string;
      priority?: "low" | "normal" | "high";
      [key: string]: any;
    };
  }
}

export {};
