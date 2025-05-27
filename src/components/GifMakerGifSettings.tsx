import React from "react";

type GifMakerGifSettingsProps = {
  gifSettings: {
    maxDuration: number;
    fps: number;
    quality: number;
  };
  setMaxDuration: (value: number) => void;
  setFps: (value: number) => void;
  setQuality: (value: number) => void;
};

const GifMakerGifSettings = ({
  gifSettings,
  setMaxDuration,
  setFps,
  setQuality,
}: GifMakerGifSettingsProps) => {
  return (
    <div className="mb-6">
      <h3 className="text-gray-300 mb-2 font-medium">GIF Settings</h3>
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <div className="mb-2">
          <label className="text-sm text-gray-300 mb-1 block">
            Duration (seconds): {gifSettings.maxDuration}s
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={gifSettings.maxDuration}
            onChange={(e) => setMaxDuration(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="mb-2">
          <label className="text-sm text-gray-300 mb-1 block">
            GIF Framerate: {gifSettings.fps} fps
          </label>
          <input
            type="range"
            min="5"
            max="30"
            step="1"
            value={gifSettings.fps}
            onChange={(e) => setFps(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Higher framerates result in smoother animation but larger file size
          </p>
        </div>

        <div className="mb-2">
          <label className="text-sm text-gray-300 mb-1 block">
            Quality: {gifSettings.quality}
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={gifSettings.quality}
            onChange={(e) => setQuality(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Higher quality results in better image quality but larger file size
          </p>
        </div>
      </div>
    </div>
  );
};

export default GifMakerGifSettings;
