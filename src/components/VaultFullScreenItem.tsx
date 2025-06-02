import { X } from "lucide-react";
import React from "react";

type VaultFullScreenItemProps = {
  setFullscreenItem: (
    item: {
      id: number;
      name: string;
      src: string;
      poster?: string;
      type: "image" | "video";
    } | null
  ) => void;
  fullscreenItem: {
    id: number;
    name: string;
    src: string;
    poster?: string;
    type: "image" | "video";
  } | null;
};

const VaultFullScreenItem = ({
  setFullscreenItem,
  fullscreenItem,

}: VaultFullScreenItemProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <button
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        onClick={() => setFullscreenItem(null)}
      >
        <X size={32} />
      </button>
      <div className="relative max-w-6xl max-h-full">
        {fullscreenItem && fullscreenItem.type === "image" ? (
          <img
            src={fullscreenItem?.src}
            alt={fullscreenItem?.name}
            className="max-h-screen"
          />
        ) : (
          <div className="relative aspect-video max-h-screen flex items-center justify-center bg-black">
            <video
              src={fullscreenItem?.src}
              className="max-h-screen"
              controls
              playsInline
              poster={fullscreenItem?.poster}
            />
          </div>
        )}

        <div className="text-white text-center mt-4">
          <h3 className="text-xl">{fullscreenItem?.name}</h3>
        </div>
      </div>
    </div>
  );
};

export default VaultFullScreenItem;
