import { Loader2 } from "lucide-react";
import React, { useState } from "react";

type GifMakerBlurEditorProps = {
  canvasBlurRef: React.RefObject<HTMLCanvasElement | null>;
  maskCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  startDrawing: (e: React.MouseEvent | React.TouchEvent) => void;
  draw: (e: React.MouseEvent | React.TouchEvent) => void;
  stopDrawing: () => void;
  blurSettings: {
    blurType: string;
    blurIntensity: number;
    brushSize: number;
  };
  setBlurType: (type: BlurSettings["blurType"]) => void;
  setBlurIntensity: (intensity: number) => void;
  setBrushSize: (size: number) => void;
  clearMask: () => void;
  isGifLoaded: boolean;
  processAllFrames: () => void;
  reconstructGif: () => void;
  isGifProcessing: boolean;
  isDrawing?: boolean;
  setGifUrl: (url: string) => void;
  gifUrlHistory: string[];
  setGifUrlHistory: (urls: string[]) => void;
  gifUrl: string;
};

const GifMakerBlurEditor = ({
  canvasBlurRef,
  maskCanvasRef,
  startDrawing,
  draw,
  stopDrawing,
  blurSettings,
  setBlurType,
  setBlurIntensity,
  setBrushSize,
  isGifLoaded,
  gifUrl,
  reconstructGif,
  isGifProcessing,
  setGifUrl,
  gifUrlHistory,
  setGifUrlHistory,
}: GifMakerBlurEditorProps) => {
  const [isUndoing, setIsUndoing] = useState(false);

  const handleUndo = () => {
    setIsUndoing(true);
    if (gifUrlHistory.length > 1) {
      const newHistory = [...gifUrlHistory];
      newHistory.pop(); // Remove the last URL
      setGifUrlHistory(newHistory);
      setGifUrl(newHistory[newHistory.length - 1] || "");
      setIsUndoing(false);
    } else {
      setIsUndoing(false);
    }
  };
  return (
    <div className="mt-6 bg-gray-900 p-4 rounded-lg border border-gray-700">
      <h3 className="text-gray-300 mb-4 font-medium">Blur Editor</h3>

      {/* Drawing canvas container with GIF background */}
      <div
        className="relative cursor-crosshair"
        style={{ maxWidth: "100%", overflow: "auto" }}
      >
        {/* Animated GIF as background (bottom layer) */}
        {gifUrl && (
          <img
            src={gifUrl}
            alt="GIF preview"
            className="max-w-full border border-gray-600 rounded-lg"
            style={{ display: "block" }}
          />
        )}

        {/* Main canvas that displays the current frame (middle layer) */}
        <canvas
          ref={canvasBlurRef}
          className="absolute top-0 left-0 max-w-full border border-gray-600 rounded-lg"
          style={{
            cursor: "crosshair",
            opacity: 0.0, // Make it semi-transparent to see the GIF underneath
            zIndex: 5,
          }}
        />

        {/* Mask canvas for drawing (top layer) */}
        <canvas
          ref={maskCanvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute top-0 left-0"
          style={{
            maxWidth: "100%",
            pointerEvents: "auto",
            zIndex: 10,
            opacity: 0.5, // Semi-transparent to see what you're drawing
          }}
        />
      </div>

      {/* Controls */}
      <div className="mt-4 p-4 bg-gray-800 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Blur type */}
          <div>
            <label className="block mb-2 text-gray-300">Blur Type</label>
            <select
              value={blurSettings.blurType}
              onChange={(e) =>
                setBlurType(e.target.value as BlurSettings["blurType"])
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300"
            >
              <option value="gaussian">Gaussian Blur</option>
              <option value="pixelated">Pixelated</option>
              <option value="mosaic">Mosaic</option>
            </select>
          </div>
          <div></div>

          {/* Blur intensity */}
          <div>
            <label className="block mb-2 text-gray-300">
              Blur Intensity: {blurSettings.blurIntensity}
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={blurSettings.blurIntensity}
              onChange={(e) => setBlurIntensity(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Brush size */}
          <div>
            <label className="block mb-2 text-gray-300">
              Brush Size: {blurSettings.brushSize}px
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={blurSettings.brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Save Blurred GIF */}
      <div className="mt-4  justify-center grid grid-cols-3 gap-4">
        <button
          onClick={handleUndo}
          disabled={isUndoing}
          className="w-full bg-red-600 col-span-1 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {isUndoing ? "Undoing..." : "Undo Last Action"}
        </button>
        <button
          onClick={reconstructGif}
          disabled={isGifProcessing || !isGifLoaded}
          className={`${
            isGifProcessing
              ? "bg-purple-800"
              : "bg-purple-600 hover:bg-purple-500"
          } text-white px-4 py-2 rounded-lg transition-colors flex col-span-2 items-center`}
        >
          {isGifProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <p className="w-full text-center">Process Blur GIF</p>
          )}
        </button>
      </div>
    </div>
  );
};

export default GifMakerBlurEditor;
