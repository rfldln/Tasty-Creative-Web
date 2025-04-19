/* eslint-disable @next/next/no-img-element */
import React from "react";

const extractDriveId = (url: string) => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  return match ? match[1] : null;
};

const ModelCard = ({ model }: ModelCardProps) => {
  const fileId = extractDriveId(model.profile);
  const embedUrl = fileId
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : null;

  return (
    <div className="aspect-video rounded-xl bg-muted/50 p-4 flex flex-col justify-between ">
      <div className="text-lg font-semibold">{model.name}</div>
      {embedUrl ? (
        <div className="flex-grow flex items-center justify-center relative">
          <div className="absolute bg-transparent h-full w-full"></div>
          <iframe
            src={embedUrl}
            width="100%"
            height="200"
            allow="autoplay"
            loading="lazy"
            className="rounded-md mt-2"
          />
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center h-[207px]">
          <img src="/model.png" alt="" height={200} width={200} />
        </div>
      )}
    </div>
  );
};

export default ModelCard;
