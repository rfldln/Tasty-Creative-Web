import React, { useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import FontSelector from "./FontSelector";

const GifMakerTextOverlay = ({
  gifUrl,
  formData,
}: {
  gifUrl: string;
  formData: ModelFormData | undefined;
}) => {
  const [text, setText] = useState("Your text here");
  const [fontSize, setFontSize] = useState(24);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFont, setSelectedFont] = useState<string>("Bebas Neue");
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  }>({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const requestId = uuidv4(); // Generate unique ID
  const data = formData;

  const lastCheckTimestamp = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [webhookData, setWebhookData] = useState<any>(null);
  console.log("Webhook Data:", webhookData);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      const { offsetWidth, offsetHeight } = imageRef.current;
      setImageDimensions({
        width: offsetWidth,
        height: offsetHeight,
        naturalWidth,
        naturalHeight,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    // const containerRect = containerRef.current.getBoundingClientRect();

    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current || !imageDimensions.width) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;

    // Keep text within image bounds only
    const maxX = imageDimensions.width - 100; // Approximate text width buffer
    const maxY = imageDimensions.height - fontSize;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const sendToWebhook = async () => {
    setIsLoading(true);

    try {
      const blob = await fetch(gifUrl).then((res) => res.blob());
      const formData = new FormData();
      formData.append("modelName", data?.model ? data.model.toString() : "");
      formData.append("file", blob, "text-overlay.gif");
      formData.append("text", text);
      formData.append("fontSize", fontSize.toString());
      formData.append("positionX", position.x.toString());
      formData.append("positionY", position.y.toString());
      formData.append("requestId", requestId);
      const response = await fetch(
        "https://n8n.tastycreative.xyz/webhook/a43d0bda-d09e-41c6-88fe-41c47891d7cd",
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        // alert("GIF sent successfully!");
        startChecking(requestId);
      } else {
        alert("Failed to send GIF");
      }
    } catch (error) {
      console.error("Error sending GIF:", error);
      alert("Error sending GIF");
    }
  };

  const fetchWebhookData = async (requestId: string) => {
    try {
      const response = await fetch(`/api/webhook?requestId=${requestId}`);

      if (!response.ok) {
        console.error("Webhook data request failed:", response.statusText);
        return;
      }

      const result = await response.json();

      if (!result || !result.data) {
        console.warn("No data found for requestId:", requestId);
        return;
      }

      if (result.timestamp > lastCheckTimestamp.current) {
        setWebhookData(result.data);

        lastCheckTimestamp.current = result.timestamp;

        stopChecking();
      }
    } catch (error) {
      console.error("Error fetching webhook data:", error);
    }
  };

  const startChecking = (requestId: string) => {
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
      checkInterval.current = null;
    }

    checkInterval.current = setInterval(() => {
      fetchWebhookData(requestId);
    }, 2000);
  };

  // Check for initial data on mount

  const stopChecking = () => {
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
      checkInterval.current = null;
    }
  };

  return (
    <div className="w-full mx-auto p-6 bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        GIF Text Overlay Editor
      </h2>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Content
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your text"
          />
        </div>
        <div>
          <FontSelector
            selectedFont={selectedFont}
            setSelectedFont={setSelectedFont}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Size: {fontSize}px
          </label>
          <input
            type="range"
            min="12"
            max="72"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              X Position: {Math.round(position.x)}px
            </label>
            <input
              type="range"
              min="0"
              max={Math.max(0, imageDimensions.width - 100)}
              value={position.x}
              onChange={(e) =>
                setPosition((prev) => ({
                  ...prev,
                  x: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={!imageDimensions.width}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Y Position: {Math.round(position.y)}px
            </label>
            <input
              type="range"
              min="0"
              max={Math.max(0, imageDimensions.height - fontSize)}
              value={position.y}
              onChange={(e) =>
                setPosition((prev) => ({
                  ...prev,
                  y: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={!imageDimensions.width}
            />
          </div>
        </div>
      </div>

      {/* GIF Container */}
      <div className="flex w-full flex-col justify-between items-center">
        <div
          ref={containerRef}
          className="relative bg-gray-100 rounded-lg overflow-hidden mb-6 cursor-crosshair inline-block"
          style={{
            width: imageDimensions.width || "auto",
            height: imageDimensions.height || "auto",
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {gifUrl && (
            <img
              ref={imageRef}
              src={gifUrl}
              alt="GIF"
              className="max-w-full rounded-lg"
              draggable={false}
              onLoad={handleImageLoad}
            />
          )}
          <DynamicFontLoader font={selectedFont} />
          {/* Text Overlay - Only appears when image is loaded */}
          {imageDimensions.width > 0 && (
            <div
              className={`absolute text-white font-bold cursor-move select-none  `}
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                fontSize: `${fontSize}px`,
                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                userSelect: "none",
                fontFamily: selectedFont,
              }}
              onMouseDown={handleMouseDown}
            >
              {text}
            </div>
          )}
        </div>
      </div>

      {/* Send Button */}
      <button
        onClick={sendToWebhook}
        // disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
      >
        {isLoading ? "Applying..." : "Apply Text Overlay"}
      </button>
    </div>
  );
};

export default GifMakerTextOverlay;

import { useEffect } from "react";

function DynamicFontLoader({ font }: { font: string }) {
  useEffect(() => {
    if (!font) return;
    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?family=${font.replace(
      / /g,
      "+"
    )}&display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [font]);

  return null;
}
