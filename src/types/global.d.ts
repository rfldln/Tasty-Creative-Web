/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { NextApiResponse } from 'next';

declare global {
  interface NotificationData {
    message: string;
    timestamp: string;
    [key: string]: any;
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
      priority?: 'low' | 'normal' | 'high';
      [key: string]: any;
    };
  }
}

export {};
