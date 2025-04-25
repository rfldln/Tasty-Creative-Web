// lib/socket.ts
import { Server as SocketIOServer } from 'socket.io';

// Define a singleton class for socket management
class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer | null = null;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }

  // For Next.js 15 route handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createIOServer(options: any = {}): SocketIOServer {
    if (!this.io) {
      this.io = new SocketIOServer(options);
      
      this.io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        
        socket.on('disconnect', () => {
          console.log('Client disconnected:', socket.id);
        });
      });
    }
    
    return this.io;
  }

  sendNotification(data: NotificationData): void {
    if (this.io) {
      this.io.emit('notification', data);
    } else {
      console.error('Socket.io server not initialized');
    }
  }
}

export default SocketService;