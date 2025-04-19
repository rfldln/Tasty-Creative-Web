import React, { useState } from "react";

const extractDriveId = (url: string) => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  return match ? match[1] : null;
};

const ModelCard = ({ model }: ModelCardProps) => {
  const [showIframe, setShowIframe] = useState(false);

  const fileId = extractDriveId(model.profile);
  const embedUrl = fileId
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : null;

  const thumbnailUrl = fileId
    ? `https://lh3.googleusercontent.com/d/${fileId}`
    : null;

  return (
    <div className="aspect-video rounded-xl bg-muted/50 p-4 flex flex-col justify-between">
      <div className="text-lg font-semibold">{model.name}</div>

      <div className="flex-grow flex items-center justify-center relative">
        {!showIframe && thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Preview"
            className="rounded-md mt-2 cursor-pointer object-cover h-[208px]"
            onClick={() => setShowIframe(true)}
          />
        ) : embedUrl ? (
          <iframe
            src={embedUrl}
            width="100%"
            height="200"
            allow="autoplay"
            loading="lazy"
            className="rounded-md mt-2"
          />
        ) : (
          <div className="flex items-center justify-center h-[208px] w-full">
            <img src="/model.png" alt="Default" height={200} width={200} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelCard;
