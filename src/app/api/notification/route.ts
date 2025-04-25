// app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import SocketService from '@/lib/socket';

export async function POST(request: Request) {
  try {
    const body = await request.json() as NotificationPayload;
    
    // Validate the API key (recommended for security)
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== "pogiko123") {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Ensure we have the required data
    if (!body.message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create notification object
    const notification: NotificationData = {
      message: body.message,
      timestamp: new Date().toISOString(),
      ...(body.data || {}) // Include any additional data
    };
    
    // Send notification to all connected clients
    const socketService = SocketService.getInstance();
    socketService.sendNotification(notification);
    
    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Error processing notification:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}