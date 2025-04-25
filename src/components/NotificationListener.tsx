// components/NotificationListener.tsx
"use client";

import { useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";

export default function NotificationListener() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [socket, setSocket] = useState< typeof Socket | null>(null);

  useEffect(() => {
    // Connect to socket server
    const socketInit = async () => {
      const socketUrl =
        process.env.NODE_ENV === "production"
          ? "wss://tasty-creative-web.vercel.app/" // Update with your domain
          : "ws://localhost:3000";

      const socketIo = io(socketUrl, {
        path: "/api/socket",
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketIo.on("connect", () => {
        console.log("Connected to Socket.io server");
      });

      socketIo.on("notification", (data: NotificationData) => {
        console.log("New notification:", data);
        setNotifications((prev) => [data, ...prev].slice(0, 10)); // Keep the last 10 notifications
      });

      socketIo.on("disconnect", () => {
        console.log("Disconnected from Socket.io server");
      });

      setSocket(socketIo);
    };

    socketInit();

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  return (
    <div className="notification-container">
      <h2>Real-time Notifications</h2>
      {notifications.length === 0 ? (
        <p>No notifications yet</p>
      ) : (
        <ul>
          {notifications.map((notif, index) => (
            <li key={index} className="notification-item">
              <div className="notification-content">
                <p className="notification-message">{notif.message}</p>
                <small className="notification-time">
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
