/* eslint-disable @next/next/no-img-element */
"use client";

import { DISPLAY_FIELDS } from "@/lib/lib";
import React, { useEffect, useState, useRef } from "react";
import ModelAssets from "./ModelAssets";
import { extractDriveId } from "@/lib/utils";

interface ModelDetails {
  [key: string]: string;
}

type ModelHeroProps = {
  selectedModel: string | null;
};

const ModelHero = ({ selectedModel }: ModelHeroProps) => {
  const [modelDetails, setModelDetails] = useState<ModelDetails | null>(null);
  const [loading, setLoading] = useState(false);
  // Refs for measuring and setting heights
  const detailsRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Effect to equalize heights
  useEffect(() => {
    const matchHeights = () => {
      if (detailsRef.current && imageContainerRef.current) {
        const detailsHeight = detailsRef.current.offsetHeight;
        imageContainerRef.current.style.height = `${detailsHeight}px`;
      }
    };

    matchHeights();
    // Also match heights on window resize
    window.addEventListener("resize", matchHeights);

    return () => {
      window.removeEventListener("resize", matchHeights);
    };
  }, [modelDetails]);

  useEffect(() => {
    if (!selectedModel) {
      setModelDetails(null);
      return;
    }

    const fetchModelDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/google/get-model-details?name=${encodeURIComponent(
            selectedModel
          )}`
        );
        if (!res.ok) throw new Error("Failed to fetch model details");

        const data = await res.json();
        setModelDetails(data);
      } catch (err) {
        console.error("Error fetching model details:", err);
        setModelDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchModelDetails();
  }, [selectedModel]);

  const fileId = modelDetails
    ? extractDriveId(modelDetails["Profile Link"])
    : null;
  const thumbnailUrl = fileId
    ? `https://lh3.googleusercontent.com/d/${fileId}`
    : null;
  const modelName = modelDetails?.["Client Name"] || "";

  if (loading) {
    return (
      <div className="w-full h-64 rounded-xl flex items-center justify-center transition-all duration-300 bg-gradient-to-b from-gray-800 to-gray-850 shadow-lg border border-gray-700/30 overflow-hidden">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-gray-300 text-lg">Loading model info...</p>
        </div>
      </div>
    );
  }

  if (!modelDetails) return null;

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-850 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="rounded-t-xl transition-all duration-300 bg-gradient-to-b from-gray-800 to-gray-850 shadow-lg border px-4 py-6 border-gray-700/30 overflow-hidden">
        <h2 className="text-2xl font-bold text-white flex items-center ml-1">
          Model: <span className="ml-2 text-blue-400">{modelName}</span>
        </h2>
      </div>

      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Image - note the ref for controlling height */}
          <div
            ref={imageContainerRef}
            className="md:w-1/3 overflow-hidden rounded-lg shadow-md relative"
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl || "/model.png"}
                alt={modelName}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/model.png";
                }}
                className="w-full h-full object-cover object-top rounded-lg absolute inset-0 hover:scale-105 duration-300 transition-all"
              />
            ) : (
              <div className="bg-gray-800 rounded-lg flex items-center justify-center h-full">
                <img
                  src="/model.png"
                  alt="Preview"
                  className="w-full object-contain"
                />
              </div>
            )}
          </div>

          {/* Model Details - note the ref for measuring height */}
          <div ref={detailsRef} className="md:w-2/3 flex flex-col">
            <div className="bg-gray-800 rounded-lg p-5 shadow-md h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {DISPLAY_FIELDS.map(({ label, key }) => {
                  const value = modelDetails[key] || "";
                  return (
                    <div
                      key={key}
                      className="py-2 border-b border-gray-700 flex flex-col"
                    >
                      <span className="font-medium text-gray-400 text-sm">
                        {label}
                      </span>
                      <span className="text-white mt-1">
                        {key === "Profile Link" && value ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <span>View Profile</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        ) : (
                          value || "-"
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Assets Section */}
      <div className="px-6 pb-6">
        {selectedModel && <ModelAssets modelName={selectedModel} />}
      </div>
    </div>
  );
};

export default ModelHero;
