/* eslint-disable @next/next/no-img-element */
import {
  extractUrlFromFormula,
  getThumbnailUrl,
  extractLinkFromFormula,
} from "@/lib/utils";
import React from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AssetCard = ({ asset, index }: any) => {
  return (
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
            <p>No Preview Available</p>
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
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Date:</span>
            <span className="text-sm text-gray-300">
              {asset["Date"]
                ? new Date(asset["Date"]).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
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
            asset["Final Output"] &&
            typeof asset["Final Output"] === "object" &&
            "value" in asset["Final Output"] &&
            "formula" in asset["Final Output"] && (
              <a
                href={extractLinkFromFormula(asset["Final Output"].formula)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 text-center"
              >
                View Output
              </a>
            )}
          {asset["PSD File"] &&
            typeof asset["PSD File"] === "object" &&
            "value" in asset["PSD File"] &&
            "formula" in asset["PSD File"] && (
              <a
                href={extractLinkFromFormula(asset["PSD File"].formula)}
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
  );
};

export default AssetCard;
