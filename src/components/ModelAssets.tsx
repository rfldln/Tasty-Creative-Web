/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, SetStateAction } from "react";
import AssetCard from "./AssetCard";

export default function AssetTabs({ modelName }: { modelName: string }) {
  const [activeTab, setActiveTab] = useState("all");
  interface Asset {
    "Request ID": string;
    "Final Output"?: string | { value: string; formula: string };
    "PSD File"?: string | { value: string; formula: string };
    Date?: string;
    Model?: string;
    "Created by"?: string;
    type: "vip" | "live";
  }

  const [modelAssets, setModelAssets] = useState<{
    live: Asset[];
    vip: Asset[];
  }>({ live: [], vip: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch model assets from API
  useEffect(() => {
    const fetchModelAssets = async () => {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/google/get-model-assets?model=${encodeURIComponent(modelName)}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch assets");
        }

        const data = await response.json();
        console.log("Fetched model assets:", data);
        setModelAssets(data);
      } catch (err) {
        console.error("Error fetching assets:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchModelAssets();
  }, [modelName]);

  // Combined assets for "all" tab
  const allAssets = [...modelAssets.live, ...modelAssets.vip]
    .filter((asset) => asset["Date"]) // Filter out assets with undefined dates
    .sort(
      (a, b) => new Date(b["Date"]!).getTime() - new Date(a["Date"]!).getTime()
    );

  // Get assets based on active tab
  const getAssets = () => {
    switch (activeTab) {
      case "all":
        return allAssets;
      case "vip":
        return modelAssets.vip;
      case "live":
        return modelAssets.live;
      default:
        return [];
    }
  };

  // Handle tab click
  const handleTabClick = (tab: SetStateAction<string>) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full p-4 bg-gray-900 rounded-lg shadow-lg">
        <div className="text-center py-12">
          <p className="text-gray-300 text-lg">Loading assets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full p-4 bg-gray-900 rounded-lg shadow-lg">
        <div className="text-center py-12">
          <p className="text-red-400 text-lg">Error loading assets: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full p-4 bg-gray-900 rounded-lg shadow-lg">
      {/* Tab Navigation */}
      <div className="flex flex-wrap md:flex-nowrap border-b border-gray-700 mb-6">
        <button
          onClick={() => handleTabClick("all")}
          className={`flex-1 py-3 px-4 text-center font-medium text-sm md:text-base transition-colors duration-200 ${
            activeTab === "all"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-300 hover:text-blue-300"
          }`}
        >
          All Assets ({allAssets.length})
        </button>
        <button
          onClick={() => handleTabClick("vip")}
          className={`flex-1 py-3 px-4 text-center font-medium text-sm md:text-base transition-colors duration-200 ${
            activeTab === "vip"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-300 hover:text-blue-300"
          }`}
        >
          VIP Flyers ({modelAssets.vip.length})
        </button>
        <button
          onClick={() => handleTabClick("live")}
          className={`flex-1 py-3 px-4 text-center font-medium text-sm md:text-base transition-colors duration-200 ${
            activeTab === "live"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-300 hover:text-blue-300"
          }`}
        >
          Live Flyers ({modelAssets.live.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {getAssets().map((asset, index) => (
          <AssetCard asset={asset} key={index} />
        ))}
      </div>

      {/* Empty state */}
      {getAssets().length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            No assets found in this category.
          </p>
        </div>
      )}
    </div>
  );
}
