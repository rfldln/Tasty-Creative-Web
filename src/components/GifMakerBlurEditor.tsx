import { Loader2 } from "lucide-react";
import React from "react";

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

  reconstructGif,
  isGifProcessing,
}: GifMakerBlurEditorProps) => {
  return (
    <div className="mt-6 bg-gray-900 p-4 rounded-lg border border-gray-700">
      <h3 className="text-gray-300 mb-4 font-medium">Blur Editor</h3>

      {/* Drawing canvas (visible) */}
      <div
        className="relative cursor-crosshair"
        style={{ maxWidth: "100%", overflow: "auto" }}
      >
        {/* Main canvas that displays the GIF frame */}
        <canvas
          ref={canvasBlurRef}
          className="max-w-full border border-gray-600 rounded-lg"
          style={{ cursor: "crosshair" }}
        />

        {/* Mask canvas that sits on top for drawing */}
        <canvas
          ref={maskCanvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute top-0 left-0 opacity-50"
          style={{
            maxWidth: "100%",
            pointerEvents: "auto", // Make sure it receives events
            zIndex: 10, // Ensure it's above the main canvas
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

          {/* Actions */}
          {/* <div className="flex items-end space-x-2">
            <button
              onClick={() => {
                clearMask();
              }}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg flex items-center justify-center"
            >
              <Eraser className="w-4 h-4 mr-2" /> Clear
            </button>
            <button
              onClick={() => (isGifLoaded ? processAllFrames() : null)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center justify-center"
            >
              <Sliders className="w-4 h-4 mr-2" /> Apply to All Frames
            </button>
          </div> */}
        </div>
      </div>

      {/* Save Blurred GIF */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={reconstructGif}
          disabled={isGifProcessing || !isGifLoaded}
          className={`${
            isGifProcessing
              ? "bg-purple-800"
              : "bg-purple-600 hover:bg-purple-500"
          } text-white px-4 py-2 rounded-lg transition-colors flex items-center`}
        >
          {isGifProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>Proccess Blur GIF</>
          )}
        </button>
      </div>
    </div>
  );
};

export default GifMakerBlurEditor;
