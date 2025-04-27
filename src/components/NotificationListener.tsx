// components/NotificationListener.tsx
"use client";

import { useEffect, useState } from "react";
import LaunchPrepDetails from "./LaunchPrepDetails";

type NotificationData = {
  editedBy: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editedData(editedData: any): unknown;
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
          console.log(data, "data");
          console.log("Fetched notifications:", data.notifications);
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    // Initial fetch
    fetchNotifications();

    // Poll every 5 seconds (you can adjust this)
    // eslint-disable-next-line prefer-const
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
        <>
          {notifications.map((notif, index) => (
            <LaunchPrepDetails
              key={index}
              modelDataLoading={false} // Replace with actual loading state if needed
              selectedModelData={notif.editedData} // Assuming this is the data you want to show
              timestamp={notif.timestamp} // Assuming this is the timestamp you want to show
              editedBy={notif.editedBy} // Assuming this is the editor's name you want to show
            />
          ))}
        </>
      )}
    </div>
  );
}
