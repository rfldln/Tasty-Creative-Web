import React, { useState } from "react";
import GifMakerBlurEditor from "./GifMakerBlurEditor";
import GifMakerTextOverlay from "./GifMakerTextOverlay";

type GifMakerEditorSelectorProps = {
  gifUrl: string;
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
  formData?: ModelFormData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setWebhookData?: (data: any) => void;
  gifUrlHistory: string[];
  setGifUrlHistory: (urls: string[]) => void;
  setGifUrl: (url: string) => void;
  selectedCaption: string;
  setSelectedCaption: (caption: string) => void;
};

const GifMakerEditorSelector = ({
  gifUrl,
  canvasBlurRef,
  maskCanvasRef,
  startDrawing,
  stopDrawing,
  draw,
  blurSettings,
  setBlurIntensity,
  setBrushSize,
  setBlurType,
  clearMask,
  isGifLoaded,
  processAllFrames,
  reconstructGif,
  isGifProcessing,
  formData,
  setWebhookData,
  gifUrlHistory,
  setGifUrlHistory,
  setGifUrl,
  selectedCaption,
  setSelectedCaption,
}: GifMakerEditorSelectorProps) => {
  const [activeEditor, setActiveEditor] = useState("blur");

  return (
    <div className="w-full mx-auto pt-5">
      {/* Simple Tab Selector */}
      <div className="flex bg-black/60 rounded-xl p-2  max-w-md mx-auto">
        <button
          onClick={() => setActiveEditor("blur")}
          className={`
            flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200
            ${
              activeEditor === "blur"
                ? "bg-white text-black shadow-md"
                : "text-white/80 hover:text-white"
            }
          `}
        >
          🌀 Blur Editor
        </button>
        <button
          onClick={() => setActiveEditor("text")}
          className={`
            flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200
            ${
              activeEditor === "text"
                ? "bg-white text-black shadow-md"
                : "text-white/80 hover:text-white"
            }
          `}
        >
          📝 Text Overlay
        </button>
      </div>

      {/* Editor Content */}
      <div className=" rounded-2xl shadow-lg overflow-hidden">
        {activeEditor === "blur" && (
          <div>
            <GifMakerBlurEditor
              canvasBlurRef={canvasBlurRef}
              maskCanvasRef={maskCanvasRef}
              startDrawing={startDrawing}
              stopDrawing={stopDrawing}
              draw={draw}
              blurSettings={blurSettings}
              setBlurIntensity={setBlurIntensity}
              setBrushSize={setBrushSize}
              setBlurType={setBlurType}
              clearMask={clearMask}
              isGifLoaded={isGifLoaded}
              processAllFrames={processAllFrames}
              reconstructGif={reconstructGif}
              isGifProcessing={isGifProcessing}
              gifUrl={gifUrl}
              setGifUrlHistory={setGifUrlHistory}
              setGifUrl={setGifUrl}
              gifUrlHistory={gifUrlHistory}
            />
          </div>
        )}

        {activeEditor === "text" && (
          <div className="mt-2">
            <GifMakerTextOverlay
              gifUrl={gifUrl}
              formData={formData}
              setWebhookData={setWebhookData}
              gifUrlHistory={gifUrlHistory}
              setGifUrlHistory={setGifUrlHistory}
              setGifUrl={setGifUrl}
              selectedCaption={selectedCaption}
              setSelectedCaption={setSelectedCaption}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GifMakerEditorSelector;
