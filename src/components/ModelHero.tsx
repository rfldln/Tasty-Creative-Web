/* eslint-disable @next/next/no-img-element */
"use client";

import { DISPLAY_FIELDS, extractDriveId } from "@/lib/lib";
import React, { useEffect, useState } from "react";

interface ModelDetails {
  [key: string]: string;
}

type ModelHeroProps = {
  selectedModel: string | null;
};

const ModelHero = ({ selectedModel }: ModelHeroProps) => {
  const [modelDetails, setModelDetails] = useState<ModelDetails | null>(null);
  const [loading, setLoading] = useState(false);

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
      <div className="w-full h-64 animate-pulse flex items-center justify-center text-2xl font-semibold">
        Loading model info...
      </div>
    );
  }

  if (!modelDetails) return null;

  return (
    <div className=" rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-white border-b pb-2">
        Model: {modelName}
      </h2>

      <div className="flex flex-col md:flex-row gap-6 md:items-center">
        {/* Profile Image */}
        <div className="md:w-1/3 overflow-hidden rounded-md">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl || "/model.png"}
              alt={modelName}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/model.png";
              }}
              className={`object-contain object-top w-full h-full rounded-md opacity-60`}
            />
          ) : (
            <img
              src="/model.png"
              alt="Preview"
              className="w-full object-contain opacity-60 min-h-[200px]"
            />
          )}
        </div>

        {/* Model Details */}
        <div className="md:w-2/3 flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {DISPLAY_FIELDS.map(({ label, key }) => {
              const value = modelDetails[key] || "";
              return (
                <div key={key} className="py-1">
                  <span className="font-semibold text-gray-300">{label}:</span>{" "}
                  <span className="text-white">
                    {key === "Profile Link" && value ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        View Profile
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
  );
};

export default ModelHero;
