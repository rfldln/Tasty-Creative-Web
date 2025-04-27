import { useState, useEffect } from "react";

// Extend the Window interface to include fetchFile
declare global {
  interface Window {
    fetchFile: (path: string) => Promise<Uint8Array>;
  }
}
import dynamic from "next/dynamic";
import { FFmpeg } from "@ffmpeg/ffmpeg";

// Client-side only component
interface FFmpegComponentProps {
  croppedImageLeft: string;
  videoUrl: string;
  combinedVideoUrl: string;
  setCombinedVideoUrl: (url: string) => void;
}

const FFmpegComponent = ({
  croppedImageLeft,
  videoUrl,
  combinedVideoUrl,
  setCombinedVideoUrl,
}: FFmpegComponentProps) => {
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    // Dynamic import within useEffect to avoid SSR issues
    const loadFfmpeg = async () => {
      try {
        // Import the older version of FFmpeg that's more compatible with Next.js
        const createFFmpeg = (await import("@ffmpeg/ffmpeg")).createFFmpeg;
        const fetchFile = (await import("@ffmpeg/ffmpeg")).fetchFile;

        // Store fetchFile for later use
        window.fetchFile = fetchFile;

        const ffmpegInstance = createFFmpeg({
          log: true,
          corePath: "https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js",
        });

        await ffmpegInstance.load();
        setFfmpeg(ffmpegInstance);
        setIsReady(true);
      } catch (error) {
        console.error("Error loading FFmpeg:", error);
        setError(
          "Failed to load video processing library. Please try again later."
        );
      }
    };

    loadFfmpeg();

    return () => {
      if (combinedVideoUrl) {
        URL.revokeObjectURL(combinedVideoUrl);
      }
    };
  }, []);

  const combineMediaAndDownload = async () => {
    if (!ffmpeg || !croppedImageLeft || !videoUrl) {
      setError("Missing required media files");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { fetchFile } = window;

      // Handle base64 image
      let imageData;
      if (croppedImageLeft.startsWith("data:")) {
        const response = await fetch(croppedImageLeft);
        const imageBlob = await response.blob();
        imageData = new Uint8Array(await imageBlob.arrayBuffer());
      } else {
        imageData = await fetchFile(croppedImageLeft);
      }

      // Fetch video
      const videoData = await fetchFile(videoUrl);

      // Write files to FFmpeg filesystem
      ffmpeg.FS("writeFile", "input_image.png", imageData);
      ffmpeg.FS("writeFile", "input_video.mp4", videoData);

      // Generate palette from the video
      await ffmpeg.run(
        "-i",
        "input_video.mp4",
        "-vf",
        "fps=60,scale=500:-1:flags=lanczos,palettegen",
        "-y",
        "palette.png"
      );

      // Now use the generated palette to create the GIF
      await ffmpeg.run(
        "-i",
        "input_image.png",
        "-i",
        "input_video.mp4",
        "-i",
        "palette.png", // Use the palette
        "-filter_complex",
        `
          [0:v]scale=500:1000[img];
          [1:v]scale=-1:1000,crop=500:1000:(in_w-500)/2:0[vid];
          color=c=black:s=1000x1000:d=1[bg];
          [bg][img]overlay=0:0[bg_with_img];
          [bg_with_img][vid]overlay=W/2:0
        `.replace(/\s+/g, ""),
        "-r",
        "60", // Set framerate for gif
        "-y",
        "output.gif"
      );

      // Read the output file
      const data = ffmpeg.FS("readFile", "output.gif");

      // Create a blob URL
      const blob = new Blob([new Uint8Array(data.buffer)], {
        type: "image/gif",
      });
      const url = URL.createObjectURL(blob);

      setCombinedVideoUrl(url);

      // Cleanup - unlink files to free memory
      ffmpeg.FS("unlink", "input_image.png");
      ffmpeg.FS("unlink", "input_video.mp4");
      ffmpeg.FS("unlink", "palette.png"); // Don't forget to unlink the palette
      ffmpeg.FS("unlink", "output.gif");
    } catch (error) {
      console.error("Error processing gif:", error);
      setError("Failed to process gif. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 w-full flex flex-col items-center justify-center mb-5">
      <button
        onClick={combineMediaAndDownload}
        disabled={!isReady || isLoading || !croppedImageLeft || !videoUrl}
        className={`px-4 py-2 rounded ${
          isReady && !isLoading && croppedImageLeft && videoUrl
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
      >
        {isLoading
          ? "Processing..."
          : isReady
          ? "Generate Video"
          : "Loading FFmpeg..."}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
      {combinedVideoUrl && (
        <div className="mt-4">
          <p className="mb-2">Generated:</p>
          <img
            src={combinedVideoUrl}
            alt="Generated GIF"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
};

// Create a non-SSR version of the component
export const ClientSideFFmpeg = dynamic(
  () => Promise.resolve(FFmpegComponent),
  { ssr: false }
);
