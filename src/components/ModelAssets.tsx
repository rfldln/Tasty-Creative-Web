/* eslint-disable @next/next/no-img-element */
import { extractDriveId } from "@/lib/lib";
import { useState, useEffect, SetStateAction } from "react";

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

  // Function to generate thumbnail URL based on fileId
  const getThumbnailUrl = (fileId: string | undefined) => {
    console.log("File ID:", fileId); // Debugging line
    const extractedFileId = fileId ? extractDriveId(fileId) : "";
    console.log("Extracted File ID:", extractedFileId); // Debugging line
    return fileId
      ? `https://lh3.googleusercontent.com/d/${extractedFileId}`
      : undefined;
  };

  // Function to extract URL from formula
  const extractUrlFromFormula = (formula: string): string => {
    const regex = /HYPERLINK\("([^"]+)"/;
    const match = formula.match(regex);
    const fileId = match ? extractDriveId(match[1]) : null;
    const thumbnailUrl = fileId
      ? `https://lh3.googleusercontent.com/d/${fileId}`
      : null;
    return thumbnailUrl || "";
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
          <div
            key={`${asset["Request ID"]}-${index}`}
            className="bg-gray-800 rounded-lg flex flex-col justify-between overflow-hidden shadow-md transition-transform duration-300 hover:shadow-blue-900/40 hover:scale-105"
          >
            <div className="relative">
              <div className="h-48 bg-black flex items-center justify-center">
                {asset["Final Output"] &&
                typeof asset["Final Output"] === "string" ? (
                  <img
                    src={
                      asset["Final Output"].includes("drive.google.com")
                        ? extractUrlFromFormula(asset["Final Output"])
                        : getThumbnailUrl(asset["Final Output"])
                    }
                    alt={`Asset ${asset["Request ID"]}`}
                    className="max-h-full object-contain"
                    loading="lazy"
                  />
                ) : asset["Final Output"] &&
                  typeof asset["Final Output"] === "object" ? (
                  <img
                    src={extractUrlFromFormula(asset["Final Output"].formula)}
                    alt={`Asset ${asset["Request ID"]}`}
                    className="max-h-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <img
                    src={getThumbnailUrl(asset["Request ID"])}
                    alt={`Asset ${asset["Request ID"]}`}
                    className="max-h-full object-contain"
                  />
                )}
              </div>

              <div className="absolute top-2 right-2">
                <span
                  className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    asset.type === "vip"
                      ? "bg-purple-600 text-white"
                      : "bg-green-600 text-white"
                  }`}
                >
                  {asset.type === "vip" ? "VIP" : "LIVE"}
                </span>
              </div>
            </div>

            <div className="p-4">
              <h3 className="text-lg font-bold mb-2 text-gray-100">
                Request ID: {asset["Request ID"]}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Date:</span>
                  <span className="text-sm text-gray-300">
                    {asset["Date"] || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Model:</span>
                  <span className="text-sm text-gray-300">
                    {asset["Model"] || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Created by:</span>
                  <span className="text-sm text-gray-300">
                    {asset["Created by"] || "N/A"}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                {asset["Final Output"] &&
                  typeof asset["Final Output"] === "string" && (
                    <a
                      href={asset["Final Output"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 text-center"
                    >
                      View Output
                    </a>
                  )}
                {asset["PSD File"] && typeof asset["PSD File"] === "string" && (
                  <a
                    href={asset["PSD File"]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 text-center"
                  >
                    PSD File
                  </a>
                )}
              </div>
            </div>
          </div>
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
