/* eslint-disable @next/next/no-img-element */
import React from "react";

const extractDriveId = (url: string) => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  return match ? match[1] : null;
};

const ModelCard = ({ model }: ModelCardProps) => {
  const fileId = extractDriveId(model.profile);
  const thumbnailUrl = fileId
    ? `https://lh3.googleusercontent.com/d/${fileId}`
    : null;

  return (
    <div className="rounded-xl bg-muted/50 p-4 flex flex-col justify-between h-[300px]">
      <div className="text-lg font-semibold mb-2">{model.name}</div>
      <div className="flex-grow flex items-center justify-center overflow-hidden rounded-md">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Preview"
            className="object-cover w-full h-full rounded-md"
          />
        ) : (
          <img
            src="/model.png"
            alt="Default"
            className="object-contain w-full h-full opacity-60"
          />
        )}
      </div>
    </div>
  );
};

export default ModelCard;
