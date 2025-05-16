import { Play, Image as ImageIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";

type VaultCategoryItemsProps = {
  selectedClient: { id: number; email: string } | null;
  selectedCategory: { id: number; tag: string } | null;
  setFullscreenItem: (item: {
    id: number;
    name: string;
    src: string;
    poster?: string;
    type: "image" | "video";
  }) => void;
};

const VaultCategoryItems = ({
  selectedClient,
  selectedCategory,
  setFullscreenItem,
}: VaultCategoryItemsProps) => {
  const [syncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastCheckTimestamp = useRef(0);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  const [lastSync, setLastSync] = useState("");
  const requestId = uuidv4();
  const [categoryItems, setCategoryItems] = useState<
    {
      id: number;
      name: string;
      src: string;
      poster: string;
      type: "image" | "video";
      updatedAt: string;
    }[]
  >([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedCategory) {
      setCategoryItems([]);
      setIsLoading(true);
      fetch(
        `/api/be/vault-category-items?vaultId=${encodeURIComponent(
          selectedCategory.id
        )}`
      )
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = data.map((item: any) => ({
            id: item.id,
            name: item.filename,
            type: item.type,
            src: `/api/be/proxy?path=${btoa(item.local_url)}`,
            poster: `/api/be/proxy?path=${btoa(item.poster_url)}`,
            updatedAt: item.updatedAt,
          }));
          setCategoryItems(items);
        })
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [selectedCategory, lastSync]);

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
          type: "item",
          email: selectedClient?.email,
          vaultTag: selectedCategory?.tag?.replace(/^#/, ""),
          vaultId: selectedCategory?.id,
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
    <div className="flex-grow h-full bg-gray-800/40 overflow-y-auto p-4">
      {selectedCategory ? (
        <>
          <div className="flex items-center mb-4 justify-between">
            <h2 className="font-bold ">{selectedCategory.tag}</h2>
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <button
                  disabled={syncing}
                  onClick={handleSync}
                  className="text-sm px-1 bg-yellow-400/40 rounded-md cursor-pointer"
                >
                  {syncing ? "Syncing..." : "Sync"}
                </button>
                <p className="text-gray-500 text-[10px]">
                  last sync: {categoryItems[0]?.updatedAt}
                </p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categoryItems.length > 0 ? (
              categoryItems.map((item) => (
                <div
                  key={item.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden"
                  onClick={() => setFullscreenItem(item)}
                >
                  {item.type === "image" ? (
                    <Image
                      src={item.src}
                      alt={item.name}
                      className="w-full h-32 object-cover bg-black"
                      width={500}
                      height={500}
                      loading="lazy"
                    />
                  ) : (
                    <>
                      <Image
                        src={item.poster}
                        alt={item.name}
                        className="w-full h-32 object-cover bg-black"
                        width={500}
                        height={500}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-90 group-hover:opacity-100">
                        <Play className="text-white" size={36} />
                      </div>
                    </>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-sm truncate">
                    {item.name}
                  </div>
                </div>
              ))
            ) : isLoading ? (
              <div className="col-span-full text-gray-400 italic text-sm">
                Loading items...
              </div>
            ) : (
              <div className="col-span-full text-gray-400 italic text-sm">
                No items found in this category
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <ImageIcon className="mb-2" size={48} />
          <p>Select a category to view items</p>
        </div>
      )}
      {/* {error && (
        <div className="text-red-500 text-sm mt-2">
          <p>Error: {error}</p>
          <p>Please try again later.</p>
        </div>
      )} */}
    </div>
  );
};

export default VaultCategoryItems;
