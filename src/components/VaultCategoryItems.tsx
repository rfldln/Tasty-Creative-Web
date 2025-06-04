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
  type?: string;
};

const VaultCategoryItems = ({
  selectedClient,
  selectedCategory,
  setFullscreenItem,
  type,
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
          let items = data.map((item: any) => ({
            id: item.id,
            name: item.filename,
            type: item.type,
            src: `/api/be/proxy?path=${btoa(item.local_url)}`,
            poster: `/api/be/proxy?path=${btoa(item.poster_url)}`,
            updatedAt: item.updatedAt,
          }));

          // Optional filter by type
          if (type) {
            items = items.filter(
              (item: {
                id: number;
                name: string;
                src: string;
                poster: string;
                type: "image" | "video";
                updatedAt: string;
              }) => item.type === type
            );
          }

          setCategoryItems(items);
        })
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [selectedCategory, lastSync, type]);

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
    <div className="flex-1 flex flex-col bg-gray-800 overflow-hidden">
      {selectedCategory ? (
        <>
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-xl truncate mr-4">
                {selectedCategory.tag}
              </h2>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  disabled={syncing}
                  onClick={handleSync}
                  className="text-sm px-3 py-2 bg-yellow-400/40 hover:bg-yellow-400/60 rounded-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncing ? "Syncing..." : "Sync"}
                </button>
                <p className="text-gray-500 text-sm hidden lg:block">
                  last sync: {categoryItems[0]?.updatedAt}
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4  gap-6">
              {categoryItems.length > 0 ? (
                categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-700 hover:bg-gray-700 transition-colors"
                      onClick={() => setFullscreenItem(item)}
                    >
                      {item.type === "image" ? (
                        <Image
                          src={item.src}
                          alt={item.name}
                          className="w-full h-40 lg:h-48 object-cover bg-black"
                          width={500}
                          height={500}
                          loading="lazy"
                        />
                      ) : (
                        <>
                          <Image
                            src={item.poster}
                            alt={item.name}
                            className="w-full h-40 lg:h-48 object-cover bg-black"
                            width={500}
                            height={500}
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-90 group-hover:opacity-100 transition-opacity">
                            <Play className="text-white" size={48} />
                          </div>
                        </>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-3">
                        <p className="truncate text-sm" title={item.name}>
                          {item.name}
                        </p>
                      </div>
                    </div>
                ))
              ) : isLoading ? (
                <div className="col-span-full text-center text-gray-400 italic py-12 text-lg">
                  Loading items...
                </div>
              ) : (
                <div className="col-span-full text-center text-gray-400 italic py-12 text-lg">
                  No items found in this category
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <ImageIcon className="mb-4" size={64} />
          <p className="text-center text-xl">Select a category to view items</p>
        </div>
      )}

      {/* {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg">
          <p>Error: {error}</p>
          <p>Please try again later.</p>
        </div>
      )} */}
    </div>
  );
};

export default VaultCategoryItems;