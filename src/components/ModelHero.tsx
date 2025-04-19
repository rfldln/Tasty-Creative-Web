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

  if (loading)
    return (
      <div className="w-full h-[300px] animate-pulse  flex items-center justify-center text-2xl font-semibold">
        Loading model info...
      </div>
    );
  if (!modelDetails) return <div></div>;

  return (
    <div className="p-4 space-y-3 grid grid-cols-2 ">
      <h2 className="text-2xl font-bold col-span-2">
        Model: {modelDetails["Client Name"]}
      </h2>
      <div className="flex  gap-2 col-span-2">
        <div className="flex-grow overflow-hidden rounded-md max-h-[300px] max-w-[300px] min-h-[300px] min-w-[300px]">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={modelDetails["Client Name"]}
              className="object-cover object-top w-full h-full rounded-md"
            />
          ) : (
            <img
              src="/model.png"
              alt="Preview"
              className="object-contain object-top w-full h-full opacity-60"
            />
          )}
        </div>
        <div className="flex flex-col justify-between w-full h-full">
          <ul className="space-y-1 w-full">
            {DISPLAY_FIELDS.map(({ label, key }) => {
              const value = modelDetails[key] || "";
              return (
                <li key={key} className="text-sm">
                  <strong>{label}:</strong>{" "}
                  {key === "Profile Link" && value ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View Profile
                    </a>
                  ) : (
                    value || "-"
                  )}
                </li>
              );
            })}
          </ul>
          <div></div>
        </div>
      </div>
    </div>
  );
};

export default ModelHero;
