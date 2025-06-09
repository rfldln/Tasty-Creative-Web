import { useRef } from "react";
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

  const TITLE_CONFIG = {
    TEXT: "Audio " + audioNo,
    Y_POSITION: 150,
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
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = `${currentLine} ${word}`;
      const width = ctx.measureText(testLine).width;

      if (width < maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    lines.push(currentLine);
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

    // Set voice text styles
    ctx.fillStyle = "#ef4444"; // red-500
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Wrap and draw text
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
  const embedTextToImage = (): void => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
      console.error("Canvas or context not available");
      return;
    }

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
      } catch (error) {
        console.error("Error generating image:", error);
      }
    };

    img.onerror = () => {
      console.error("Failed to load background image");
    };

    img.src = TEMPLATE_CONFIG.IMAGE_PATH;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <h1 className="text-white text-large font-bold">Voice Note Card</h1>

      {/* Preview Card */}
      <div className="relative flex justify-center items-center">
        <img
          src={TEMPLATE_CONFIG.IMAGE_PATH}
          alt="Voice note template"
          width={TEMPLATE_CONFIG.PREVIEW_SIZE}
          height={TEMPLATE_CONFIG.PREVIEW_SIZE}
          loading="lazy"
        />

        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col items-center p-4">
          {/* Title */}
          <h2 className="text-black text-3xl underline font-bold font-inter mb-3 mt-5 text-center">
            {TITLE_CONFIG.TEXT}
          </h2>

          {/* Voice Text */}
          <p
            className={`
              text-red-500 font-bold font-inter text-center leading-relaxed 
              px-10 break-words overflow-wrap-anywhere max-w-full
              ${getPreviewTextSize(voiceText.length)}
            `}
          >
            {voiceText}
          </p>
        </div>
      </div>

      {/* Hidden Canvas for Image Generation */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Download Button */}
      <Button
        onClick={embedTextToImage}
        className="
          bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg py-1
        "
        type="button"
        aria-label="Download voice note card as image"
      >
        Download Voice Note Card
      </Button>
    </div>
  );
};

export default VoiceNoteCard;
