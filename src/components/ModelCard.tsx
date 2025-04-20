/* eslint-disable @next/next/no-img-element */
"use client";

import { cn, extractDriveId } from "@/lib/utils";
import React, { useEffect, useState } from "react";

interface ModelCardProps {
  model: {
    name: string;
    profile: string;
    status: string;
  };
  setSelectedModel: (name: string) => void;
}

const ModelCard = ({ model, setSelectedModel }: ModelCardProps) => {
  const fileId = extractDriveId(model.profile);
  const thumbnailUrl = fileId
    ? `https://lh3.googleusercontent.com/d/${fileId}`
    : null;

  const [imgSrc, setImgSrc] = useState(thumbnailUrl || "/model.png");

  useEffect(() => {
    setImgSrc(thumbnailUrl || "/model.png");
  }, [thumbnailUrl]);

  const isFallback = imgSrc === "/model.png";

  const handleClick = () => {
    setSelectedModel(model.name);
  };

  return (
    <div
      onClick={handleClick}
      className="rounded-xl bg-gray-800 overflow-hidden shadow-lg cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-blue-900/20 hover:shadow-xl group border border-gray-700 h-[300px] flex flex-col"
    >
      {/* Card Image Section */}
      <div className="h-[220px] overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-40 z-10"></div>
        <img
          src={imgSrc}
          alt={model.name}
          onError={() => setImgSrc("/model.png")}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
            isFallback ? "opacity-60 " : ""
          }`}
        />
      </div>

      {/* Card Footer with Name */}
      <div className="p-4 flex items-center justify-between bg-gray-900 flex-grow">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
            {model.name}
          </h3>
          <div className="text-xs text-gray-400 mt-1">View model details</div>
        </div>

        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-3 right-3 flex items-center bg-gray-900/70 rounded-full px-2 py-1 backdrop-blur-sm">
        <div
          className={cn("h-2 w-2 rounded-full bg-green-500 mr-1", {
            "bg-red-500": model.status === "Dropped",
          })}
        ></div>
        <span className="text-xs font-medium text-white">{model.status}</span>
      </div>
    </div>
  );
};

export default ModelCard;
