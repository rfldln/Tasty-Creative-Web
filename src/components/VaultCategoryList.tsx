import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

type VaultCategoryListProps = {
  clientLoading: boolean;
  selectedClient: { id: number; email: string } | null;
  selectedCategory: { id: number; tag: string } | null;
  setSelectedCategory: (category: { id: number; tag: string } | null) => void;
};

type VaultCategory = {
  id: number;
  tag: string;
  clientId: number;
  client: {
    id: number;
    email: string;
  };
};

const VaultCategoryList = ({
  clientLoading,
  selectedClient,
  selectedCategory,
  setSelectedCategory,
}: VaultCategoryListProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [vaultCategories, setVaultCategories] = useState<VaultCategory[]>([]);
  const lastCheckTimestamp = useRef(0);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  const [lastSync, setLastSync] = useState("");
  const [syncing, setIsSyncing] = useState(false);
  const requestId = uuidv4();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedClient && selectedClient.email !== "Select a client") {
      setIsLoading(true);
      fetch(
        `/api/be/vault-category-list?email=${encodeURIComponent(
          selectedClient.email
        )}`
      )
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => setVaultCategories(data))
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [selectedClient, clientLoading, selectedCategory, lastSync]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      startChecking(requestId);
      const response = await fetch("/api/be/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "list",
          email: selectedClient?.email,
          requestId: requestId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Sync successful:", data);
      } else {
        console.error("Sync failed:", data.error);
      }
    } catch (error) {
      console.error("Error syncing:", error);
    }
  };

  const fetchWebhookData = async (requestId: string) => {
    try {
      const response = await fetch(`/api/webhook?requestId=${requestId}`);

      if (!response.ok) {
        console.error("Webhook data request failed:", response.statusText);
        return;
      }

      const result = await response.json();

      if (!result || !result.data) {
        console.warn("No data found for requestId:", requestId);
        return;
      }

      if (result.timestamp > lastCheckTimestamp.current) {
        stopChecking();
        setLastSync(result.timestamp);
      }
    } catch (error) {
      console.error("Error fetching webhook data:", error);
    }
  };

  const startChecking = (requestId: string) => {
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
      checkInterval.current = null;
    }

    checkInterval.current = setInterval(() => {
      fetchWebhookData(requestId);
    }, 2000);
  };

  const stopChecking = () => {
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
      checkInterval.current = null;
    }
    setIsSyncing(false);
  };

  return (
    <div className="w-56 h-full bg-gray-800/40 border-r border-gray-700 overflow-y-auto">
      <div className="p-4 border-b border-gray-700 flex gap-2 justify-between w-full">
        <h2 className="font-bold">Categories</h2>
        {selectedClient && selectedClient.email != "Select a client" && (
          <button
            onClick={handleSync}
            className="text-sm px-1 bg-yellow-400/40 rounded-md cursor-pointer"
          >
            {syncing ? "Syncing..." : "Sync"}
          </button>
        )}
      </div>
      <div>
        {vaultCategories.length > 0 ? (
          vaultCategories.map((category) => (
            <div
              key={category.id}
              className={`p-3 cursor-pointer hover:bg-gray-700 border-l-4 ${
                selectedCategory?.id === category.id
                  ? "border-blue-500 bg-gray-700"
                  : "border-transparent"
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category.tag}
            </div>
          ))
        ) : isLoading ? (
          <div className="p-4 text-gray-400 italic text-sm">
            Loading categories...
          </div>
        ) : selectedClient?.email === "Select a client" ? (
          <div className="p-4 text-gray-400 italic text-sm">
            Please select a client to view categories
          </div>
        ) : (
          <div className="p-4 text-gray-400 italic text-sm">
            No categories found for this client
          </div>
        )}

        {/* {error && (
          <div className="p-4 text-red-500 italic text-sm">Error: {error}</div>
        )} */}
      </div>
    </div>
  );
};

export default VaultCategoryList;
