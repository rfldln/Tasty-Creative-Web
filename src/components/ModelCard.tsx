/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { extractDriveId } from "@/lib/lib";

const ModelCard = ({
  model,
  setSelectedModel,
}: ModelCardProps) => {
  const fileId = extractDriveId(model.profile);
  const thumbnailUrl = fileId
    ? `https://lh3.googleusercontent.com/d/${fileId}`
    : null;

  const handleClick = () => {
    setSelectedModel(model.name);
  };

  return (
    <div
      onClick={handleClick}
      className="rounded-xl bg-muted/50 p-4 flex flex-col justify-between h-[300px] cursor-pointer transition hover:scale-[1.02] hover:shadow-md"
    >
      <div className="text-lg font-semibold mb-2">{model.name}</div>
      <div className="flex-grow overflow-hidden rounded-md">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={model.name}
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
    </div>
  );
};

export default ModelCard;
