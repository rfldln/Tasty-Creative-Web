import { useRef, useState, useCallback } from "react";
import { Button } from "./ui/button";

// Constants for better maintainability
const CANVAS_CONFIG = {
  WIDTH: 1080,
  HEIGHT: 1080,
  CENTER_X: 540,
} as const;

const TEXT_CONFIG = {
 START_Y: 320,
  MAX_WIDTH: 900, 
  LINE_HEIGHT_MULTIPLIER: 1.4,
  FONT_SIZES: {
    EXTRA_LARGE: 84, // <= 80 chars
    VERY_LARGE: 76, // <= 100 chars
    LARGE: 68, // <= 200 chars
    MEDIUM: 60, // > 200 chars
  },
} as const;

const TEMPLATE_CONFIG = {
  IMAGE_PATH: "/templates/SextingScriptTemplate.png",
  PREVIEW_SIZE: 300,
} as const;

interface VoiceNoteCardProps {
  voiceText: string;
  model: string;
  audioNo: number;
}

const VoiceNoteCard = ({ voiceText, model, audioNo }: VoiceNoteCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const TITLE_CONFIG = {
    TEXT: "Audio " + audioNo,
    Y_POSITION: 120,
    FONT_SIZE: 100,
    UNDERLINE_OFFSET: 90,
    UNDERLINE_THICKNESS: 7,
  } as const;

  /**
   * Determines the appropriate font size based on text length
   */
  const getFontSize = (textLength: number): number => {
    if (textLength <= 80) return TEXT_CONFIG.FONT_SIZES.EXTRA_LARGE;
    if (textLength <= 100) return TEXT_CONFIG.FONT_SIZES.VERY_LARGE;
    if (textLength <= 200) return TEXT_CONFIG.FONT_SIZES.LARGE;
    return TEXT_CONFIG.FONT_SIZES.MEDIUM;
  };

  /**
   * Gets the appropriate CSS text size class for preview
   */
  const getPreviewTextSize = (textLength: number): string => {
    if (textLength <= 80) return "text-[24px]";
    if (textLength <= 100) return "text-[20px]";
    if (textLength <= 200) return "text-[18px]";
    return "text-sm";
  };

  /**
   * Wraps text to fit within specified width
   */
  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    // Handle empty text
    if (!text) return [];
    
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      
      // Check if the word itself is too long and needs to be broken
      while (ctx.measureText(word).width > maxWidth) {
        // Find the maximum number of characters that fit
        let charCount = 0;
        let testWord = "";
        
        for (let j = 0; j < word.length; j++) {
          testWord += word[j];
          if (ctx.measureText(testWord).width > maxWidth) {
            // Back up one character
            charCount = j;
            break;
          }
          charCount = j + 1;
        }
        
        // If we can't fit even one character, force at least one
        if (charCount === 0) charCount = 1;
        
        // Add the portion that fits to the current line or as a new line
        const wordPart = word.substring(0, charCount);
        if (currentLine) {
          lines.push(currentLine);
          currentLine = "";
        }
        lines.push(wordPart);
        
        // Remove the part we just added from the word
        word = word.substring(charCount);
      }
      
      // Now handle the remaining word (or the whole word if it wasn't too long)
      if (word) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && currentLine) {
          // Current line is too long, push it and start new line with current word
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Add word to current line
          currentLine = testLine;
        }
      }
    }
    
    // Don't forget the last line
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Debug logging
    console.log("Text wrapping debug:", {
      originalText: text,
      maxWidth: maxWidth,
      linesCreated: lines.length,
      lines: lines
    });
    
    return lines;
  };

  /**
   * Draws the title with underline on the canvas
   */
  const drawTitle = (ctx: CanvasRenderingContext2D): void => {
    // Set title styles
    ctx.fillStyle = "black";
    ctx.font = `bold ${TITLE_CONFIG.FONT_SIZE}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Draw title text
    ctx.fillText(
      TITLE_CONFIG.TEXT,
      CANVAS_CONFIG.CENTER_X,
      TITLE_CONFIG.Y_POSITION
    );

    // Draw underline
    const titleWidth = ctx.measureText(TITLE_CONFIG.TEXT).width;
    const underlineY = TITLE_CONFIG.Y_POSITION + TITLE_CONFIG.UNDERLINE_OFFSET;

    ctx.beginPath();
    ctx.moveTo(CANVAS_CONFIG.CENTER_X - titleWidth / 2, underlineY);
    ctx.lineTo(CANVAS_CONFIG.CENTER_X + titleWidth / 2, underlineY);
    ctx.strokeStyle = "black";
    ctx.lineWidth = TITLE_CONFIG.UNDERLINE_THICKNESS;
    ctx.stroke();
  };

  /**
   * Draws the voice text on the canvas
   */
  const drawVoiceText = (ctx: CanvasRenderingContext2D): void => {
    const fontSize = getFontSize(voiceText.length);

    // Set voice text styles BEFORE wrapping text
    ctx.fillStyle = "#ef4444"; // red-500
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Wrap and draw text - now the font is set for proper measurement
    const lines = wrapText(ctx, voiceText, TEXT_CONFIG.MAX_WIDTH);
    const lineHeight = fontSize * TEXT_CONFIG.LINE_HEIGHT_MULTIPLIER;

    lines.forEach((line, index) => {
      const y = TEXT_CONFIG.START_Y + index * lineHeight;
      ctx.fillText(line, CANVAS_CONFIG.CENTER_X, y);
    });
  };

  /**
   * Downloads the canvas as a PNG image
   */
  const downloadImage = (canvas: HTMLCanvasElement): void => {
    const link = document.createElement("a");
    link.download = model + " Audio " + audioNo + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  /**
   * Main function to embed text to image and trigger download
   */
  const embedTextToImage = useCallback(async (): Promise<void> => {
    if (isDownloading) {
      console.log("Download already in progress, skipping...");
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
      console.error("Canvas or context not available");
      return;
    }

    console.log("Starting download process...");
    setIsDownloading(true);

    // Set canvas dimensions
    canvas.width = CANVAS_CONFIG.WIDTH;
    canvas.height = CANVAS_CONFIG.HEIGHT;

    // Load and process background image
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        // Draw background image
        ctx.drawImage(img, 0, 0, CANVAS_CONFIG.WIDTH, CANVAS_CONFIG.HEIGHT);

        // Draw title and voice text
        drawTitle(ctx);
        drawVoiceText(ctx);

        // Download the result
        downloadImage(canvas);
        console.log("Download completed");
      } catch (error) {
        console.error("Error generating image:", error);
      } finally {
        // Add a small delay before resetting the state to prevent rapid re-clicks
        setTimeout(() => {
          setIsDownloading(false);
        }, 500);
      }
    };

    img.onerror = () => {
      console.error("Failed to load background image");
      setIsDownloading(false);
    };

    img.src = TEMPLATE_CONFIG.IMAGE_PATH;
  }, [isDownloading, voiceText, model, audioNo, drawTitle, drawVoiceText, downloadImage]);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <h1 className="text-white text-large font-bold">Voice Note Card</h1>

      {/* Preview Card - Fixed 300px x 300px */}
      <div
        className="flex flex-col bg-center bg-cover rounded-lg shadow-lg overflow-hidden"
        style={{
          backgroundImage: `url(${TEMPLATE_CONFIG.IMAGE_PATH})`,
          width: '300px',
          height: '300px',
          maxWidth: '300px',
          maxHeight: '300px',
        }}
      >
        {/* Title - positioned at top with some spacing */}
        <div className="pt-7 pb-3 px-4">
          <h2 className="text-black text-3xl underline font-bold font-inter text-center">
            {TITLE_CONFIG.TEXT}
          </h2>
        </div>

        {/* Voice Text - fills remaining space */}
        <div className="flex-1 flex items-start justify-center px-6 pb-4 overflow-hidden">
          <p
            className={`
              text-red-500 font-bold font-inter text-center leading-relaxed 
              break-words w-full
              ${getPreviewTextSize(voiceText.length)}
            `}
            style={{
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {voiceText}
          </p>
        </div>
      </div>

      {/* Hidden Canvas for Image Generation */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Download Button */}
      <Button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          embedTextToImage();
        }}
        disabled={isDownloading}
        className="
          bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg py-1
          disabled:opacity-50 disabled:cursor-not-allowed max-w-[300px]
        "
        type="button"
        aria-label="Download voice note card as image"
      >
        {isDownloading ? "Downloading..." : "Download Voice Note Card"}
      </Button>
    </div>
  );
};

export default VoiceNoteCard;