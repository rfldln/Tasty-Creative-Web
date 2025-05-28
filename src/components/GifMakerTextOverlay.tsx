import React, { useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import FontSelector from "./FontSelector";

const GifMakerTextOverlay = ({
  gifUrl,
  formData,
  setWebhookData,
  gifUrlHistory,
  setGifUrlHistory,
  setGifUrl,
  selectedCaption,
  setSelectedCaption,
}: {
  gifUrl: string;
  formData: ModelFormData | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setWebhookData?: (data: any) => void;
  gifUrlHistory: string[];
  setGifUrlHistory: (urls: string[]) => void;
  setGifUrl: (url: string) => void;
  selectedCaption: string;
  setSelectedCaption: (caption: string) => void;
}) => {
 
  const [fontSize, setFontSize] = useState(24);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFont, setSelectedFont] = useState<string>("Bebas Neue");
  const [selectedTextStyle, setSelectedTextStyle] = useState<string>("TS_1");
  const [isUndoing, setIsUndoing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [overlayEmojis, setOverlayEmojis] = useState<
    Array<{
      id: string;
      emoji: string;
      position: { x: number; y: number };
      size: number;
    }>
  >([]);
  const [selectedEmojiId, setSelectedEmojiId] = useState<string | null>(null);
  const [draggedEmojiId, setDraggedEmojiId] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  }>({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const requestId = uuidv4(); // Generate unique ID
  const data = formData;

  const lastCheckTimestamp = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  const checkInterval = useRef<NodeJS.Timeout | null>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleEmojiMouseDown = (e: React.MouseEvent, emojiId: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();

    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDraggedEmojiId(emojiId);
    setSelectedEmojiId(emojiId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;

    if (isDragging && imageDimensions.width) {
      // Handle text dragging
      const maxX = imageDimensions.width - 100;
      const maxY = imageDimensions.height - fontSize;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    } else if (draggedEmojiId) {
      // Handle emoji dragging
      const emoji = overlayEmojis.find((e) => e.id === draggedEmojiId);
      if (emoji) {
        const maxX = imageDimensions.width - emoji.size;
        const maxY = imageDimensions.height - emoji.size;

        setOverlayEmojis((emojis) =>
          emojis.map((e) =>
            e.id === draggedEmojiId
              ? {
                  ...e,
                  position: {
                    x: Math.max(0, Math.min(newX, maxX)),
                    y: Math.max(0, Math.min(newY, maxY)),
                  },
                }
              : e
          )
        );
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedEmojiId(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    const newEmoji = {
      id: uuidv4(),
      emoji,
      position: { x: 100, y: 100 },
      size: 48,
    };
    setOverlayEmojis([...overlayEmojis, newEmoji]);
    setSelectedEmojiId(newEmoji.id);
    setShowEmojiPicker(false);
  };

  const handleEmojiSizeChange = (emojiId: string, newSize: number) => {
    setOverlayEmojis((emojis) =>
      emojis.map((e) => (e.id === emojiId ? { ...e, size: newSize } : e))
    );
  };

  const handleDeleteEmoji = (emojiId: string) => {
    setOverlayEmojis((emojis) => emojis.filter((e) => e.id !== emojiId));
    setSelectedEmojiId(null);
  };

  const sendToWebhook = async () => {
    setIsLoading(true);

    try {
      const blob = await fetch(gifUrl).then((res) => res.blob());
      const formData = new FormData();
      formData.append("modelName", data?.model ? data.model.toString() : "");
      formData.append("file", blob, "text-overlay.gif");
      formData.append("text", selectedCaption);
      formData.append("fontSize", fontSize.toString());
      formData.append("positionX", position.x.toString());
      formData.append("positionY", position.y.toString());
      formData.append("requestId", requestId);
      formData.append("selectedTextStyle", selectedTextStyle);
      // Add emoji data
      formData.append("emojis", JSON.stringify(overlayEmojis));

      const response = await fetch(
        "https://n8n.tastycreative.xyz/webhook/a43d0bda-d09e-41c6-88fe-41c47891d7cd",
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
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
        if (setWebhookData) {
          setWebhookData(result.data);
        }
        stopChecking();
        setIsLoading(false);
        lastCheckTimestamp.current = result.timestamp;
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

  const stopChecking = () => {
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
      checkInterval.current = null;
    }
  };

  const handleUndo = () => {
    setIsUndoing(true);
    if (gifUrlHistory.length > 1) {
      const newHistory = [...gifUrlHistory];
      newHistory.pop();
      setGifUrlHistory(newHistory);
      setGifUrl(newHistory[newHistory.length - 1] || "");
      setIsUndoing(false);
    } else {
      setIsUndoing(false);
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
            value={selectedCaption}
            onChange={(e) => setSelectedCaption(e.target.value)}
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
          <TextStyleTemplates setSelectedTextStyle={setSelectedTextStyle} />
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

        {/* <div className="grid grid-cols-2 gap-4">
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
        </div> */}

        {/* Emoji Controls */}
        <div className="relative">
          <div
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex items-center justify-center gap-2 h-8 w-8 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition-colors"
          >
            <Smile className="w-5 h-5" />
          </div>

          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute top-full mt-2 z-50 bg-gray-800 rounded-lg shadow-xl p-4"
            >
              <EmojiPicker
                onEmojiSelect={(emoji) => handleEmojiSelect(emoji)}
              />
            </div>
          )}
        </div>

        {/* Selected Emoji Controls */}
        {selectedEmojiId &&
          overlayEmojis.find((e) => e.id === selectedEmojiId) && (
            <div className="bg-gray-800 p-4 rounded-lg space-y-3">
              <h3 className="text-white font-semibold">
                Selected Emoji Controls
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Emoji Size:{" "}
                  {overlayEmojis.find((e) => e.id === selectedEmojiId)?.size}px
                </label>
                <input
                  type="range"
                  min="20"
                  max="120"
                  value={
                    overlayEmojis.find((e) => e.id === selectedEmojiId)?.size ||
                    48
                  }
                  onChange={(e) =>
                    handleEmojiSizeChange(
                      selectedEmojiId,
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <button
                onClick={() => handleDeleteEmoji(selectedEmojiId)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              >
                Delete Emoji
              </button>
            </div>
          )}
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

          {/* Text Overlay */}
          {imageDimensions.width > 0 && (
            <div
              className={`absolute text-white font-bold cursor-move select-none`}
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                fontSize: `${fontSize}px`,
                letterSpacing: "1px",
                userSelect: "none",
                fontFamily: selectedFont,
              }}
              onMouseDown={handleMouseDown}
            >
              {selectedCaption}
            </div>
          )}

          {/* Emoji Overlays */}
          {imageDimensions.width > 0 &&
            overlayEmojis.map((emoji) => (
              <div
                key={emoji.id}
                className={`absolute cursor-move select-none transition-opacity `}
                style={{
                  left: `${emoji.position.x}px`,
                  top: `${emoji.position.y}px`,
                  fontSize: `${emoji.size}px`,
                  lineHeight: 1,
                  userSelect: "none",
                }}
                onMouseDown={(e) => handleEmojiMouseDown(e, emoji.id)}
                onClick={() => setSelectedEmojiId(emoji.id)}
              >
                {emoji.emoji}
              </div>
            ))}
        </div>
      </div>

      {/* Send Button */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleUndo}
          disabled={isLoading}
          className="w-full bg-red-600 col-span-1 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {isUndoing ? "Undoing..." : "Undo Last Action"}
        </button>
        <button
          onClick={sendToWebhook}
          disabled={isLoading}
          className="w-full bg-blue-600 col-span-2 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {isLoading ? "Applying..." : "Apply Text Overlay"}
        </button>
      </div>
    </div>
  );
};

export default GifMakerTextOverlay;

import { useEffect } from "react";
import TextStyleTemplates from "./TextStyleTemplates";
import { EmojiPicker } from "./emoji-picker";
import { Smile } from "lucide-react";

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
