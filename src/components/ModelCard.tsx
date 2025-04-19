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
    <div className="aspect-video rounded-xl bg-muted/50 p-4 flex flex-col justify-between">
      <div className="text-lg font-semibold">{model.name}</div>
      <div className="flex-grow flex items-center justify-center">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Preview"
            className="rounded-md mt-2 object-cover h-[200px] w-full"
          />
        ) : (
          <div className="flex items-center justify-center h-[200px] w-full">
            <img src="/model.png" alt="Default" height={200} width={200} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelCard;
