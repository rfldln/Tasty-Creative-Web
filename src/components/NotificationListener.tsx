// components/NotificationListener.tsx
"use client";

import { useEffect, useState } from "react";

type NotificationData = {
  message: string;
  timestamp: string;
  category?: string;
  priority?: string;
};

export default function NotificationListener() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    // Initial fetch
    fetchNotifications();

    // Poll every 5 seconds (you can adjust this)
    intervalId = setInterval(fetchNotifications, 5000);

    // Cleanup
    return () => clearInterval(intervalId);
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
