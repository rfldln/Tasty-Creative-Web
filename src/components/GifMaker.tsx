"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Grid2X2,
  Columns2,
  Columns3,
  Square,
  Rows3,
  Play,
  Pause,
  Clock,
  Download,
  Loader2,
  Eraser,
  Sliders,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import dynamic from "next/dynamic";
import { parseGIF, decompressFrames } from "gifuct-js";
import GIF from "gif.js";

// Define TypeScript interfaces
interface ModelFormData {
  [key: string]: any;
}

interface VideoClip {
  file: File | null;
  startTime: number;
  endTime: number;
  duration: number;
}

const GifMaker = () => {
  const [formData, setFormData] = useState<ModelFormData>({});
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("sideBySide");
  const [maxDuration, setMaxDuration] = useState(5); // Default max duration in seconds
  const [fps, setFps] = useState(15); // Frames per second for GIF
  const [quality, setQuality] = useState(10); // Quality setting (1-30)
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false);

  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [blurType, setBlurType] = useState("gaussian"); // gaussian, pixelated, mosaic
  const [blurIntensity, setBlurIntensity] = useState(10);
  const [brushSize, setBrushSize] = useState(20);

  // GIF Blur Processing
  const [gifFrames, setGifFrames] = useState<ImageData[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isGifProcessing, setIsGifProcessing] = useState(false);
  const [isGifLoaded, setIsGifLoaded] = useState(false);

  // Refs
  const canvasBlurRef = useRef<HTMLCanvasElement | null>(null);

  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas ref for capturing frames
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const templates: Record<
    string,
    {
      name: string;
      icon: React.JSX.Element;
      cols: number;
      rows: number;
    }
  > = {
    single: {
      name: "Single",
      icon: <Square className="w-5 h-5" />,
      cols: 1,
      rows: 1,
    },
    sideBySide: {
      name: "Side by Side",
      icon: <Columns2 className="w-5 h-5" />,
      cols: 2,
      rows: 1,
    },
    triptychHorizontal: {
      name: "Horizontal Triptych",
      icon: <Columns3 className="w-5 h-5" />,
      cols: 3,
      rows: 1,
    },
    triptychVertical: {
      name: "Vertical Triptych",
      icon: <Rows3 className="w-5 h-5" />,
      cols: 1,
      rows: 3,
    },
    grid2x2: {
      name: "2x2 Grid",
      icon: <Grid2X2 className="w-5 h-5" />,
      cols: 2,
      rows: 2,
    },
  };

  type Layout =
    | "Single"
    | "Side by Side"
    | "Horizontal Triptych"
    | "Vertical Triptych"
    | "2x2 Grid";

  const scaleWidth = 320;
  const scaleHeight = 180; // Fixed positive height

  const createFilterComplex = (
    layout: Layout,
    clipCount: number,
    fps: number
  ) => {
    if (layout === "Single" && clipCount === 1) {
      return `[0:v]scale=${scaleWidth}:${scaleHeight},fps=${fps},palettegen=stats_mode=diff[p]`;
    }

    if (layout === "Side by Side" && clipCount === 2) {
      return (
        `[0:v]scale=${scaleWidth}:${scaleHeight}[v0];` +
        `[1:v]scale=${scaleWidth}:${scaleHeight}[v1];` +
        `[v0][v1]hstack=inputs=2,fps=${fps},palettegen=stats_mode=diff[p]`
      );
    }

    if (layout === "Horizontal Triptych" && clipCount === 3) {
      return (
        `[0:v]scale=${scaleWidth}:${scaleHeight}[v0];` +
        `[1:v]scale=${scaleWidth}:${scaleHeight}[v1];` +
        `[2:v]scale=${scaleWidth}:${scaleHeight}[v2];` +
        `[v0][v1][v2]hstack=inputs=3[v];` + // stack horizontally first, label [v]
        `[v]fps=${fps},palettegen=stats_mode=diff[p]` // then apply fps and palettegen filters
      );
    }

    if (layout === "Vertical Triptych" && clipCount === 3) {
      return (
        `[0:v]scale=${scaleWidth}:${scaleHeight}[v0];` +
        `[1:v]scale=${scaleWidth}:${scaleHeight}[v1];` +
        `[2:v]scale=${scaleWidth}:${scaleHeight}[v2];` +
        `[v0][v1][v2]vstack=inputs=3[v];` + // stack vertically first, label [v]
        `[v]fps=${fps},palettegen=stats_mode=diff[p]` // then apply fps and palettegen filters
      );
    }

    if (layout === "2x2 Grid" && clipCount === 4) {
      return (
        `[0:v]scale=${scaleWidth}:${scaleHeight}[v0];` +
        `[1:v]scale=${scaleWidth}:${scaleHeight}[v1];` +
        `[2:v]scale=${scaleWidth}:${scaleHeight}[v2];` +
        `[3:v]scale=${scaleWidth}:${scaleHeight}[v3];` +
        `[v0][v1][v2][v3]xstack=inputs=4:layout=0_0|${scaleWidth}_0|0_${scaleHeight}|${scaleWidth}_${scaleHeight},fps=${fps},palettegen=stats_mode=diff[p]`
      );
    }

    throw new Error(`Unsupported layout ${layout} for ${clipCount} clips`);
  };

  const createUseFilterComplex = (
    layout: Layout,
    clipCount: number,
    fps: number
  ) => {
    if (layout === "Single" && clipCount === 1) {
      return `[0:v]scale=${scaleWidth}:${scaleHeight},fps=${fps}[x];[x][1:v]paletteuse=dither=bayer`;
    }

    if (layout === "Side by Side" && clipCount === 2) {
      return (
        `[0:v]scale=${scaleWidth}:${scaleHeight}[v0];` +
        `[1:v]scale=${scaleWidth}:${scaleHeight}[v1];` +
        `[v0][v1]hstack=inputs=2,fps=${fps}[x];[x][2:v]paletteuse=dither=bayer`
      );
    }

    if (layout === "Horizontal Triptych" && clipCount === 3) {
      return (
        `[0:v]scale=${scaleWidth}:${scaleHeight}[v0];` +
        `[1:v]scale=${scaleWidth}:${scaleHeight}[v1];` +
        `[2:v]scale=${scaleWidth}:${scaleHeight}[v2];` +
        `[v0][v1][v2]hstack=inputs=3,fps=${fps}[x];[x][3:v]paletteuse=dither=bayer`
      );
    }

    if (layout === "Vertical Triptych" && clipCount === 3) {
      return (
        `[0:v]scale=${scaleWidth}:${scaleHeight}[v0];` +
        `[1:v]scale=${scaleWidth}:${scaleHeight}[v1];` +
        `[2:v]scale=${scaleWidth}:${scaleHeight}[v2];` +
        `[v0][v1][v2]vstack=inputs=3,fps=${fps}[x];[x][3:v]paletteuse=dither=bayer`
      );
    }

    if (layout === "2x2 Grid" && clipCount === 4) {
      return (
        `[0:v]scale=${scaleWidth}:${scaleHeight}[v0];` +
        `[1:v]scale=${scaleWidth}:${scaleHeight}[v1];` +
        `[2:v]scale=${scaleWidth}:${scaleHeight}[v2];` +
        `[3:v]scale=${scaleWidth}:${scaleHeight}[v3];` +
        `[v0][v1][v2][v3]xstack=inputs=4:layout=0_0|${scaleWidth}_0|0_${scaleHeight}|${scaleWidth}_${scaleHeight},fps=${fps}[x];[x][4:v]paletteuse=dither=bayer`
      );
    }

    throw new Error(`Unsupported layout ${layout} for ${clipCount} clips`);
  };

  const totalCells =
    templates[selectedTemplate].cols * templates[selectedTemplate].rows;

  const [videoClips, setVideoClips] = useState<VideoClip[]>(
    Array(totalCells).fill({
      file: null,
      startTime: 0,
      endTime: 5,
      duration: 0,
    })
  );

  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  // Additional ref for the output video grid
  const outputGridRef = useRef<HTMLDivElement>(null);

  // Function to handle video file selection
  const handleVideoChange = (index: number, file: File | null) => {
    if (!file) return;

    // Update the clips state immediately with just the file
    setVideoClips((prev) => {
      const newClips = [...prev];
      newClips[index] = {
        file: file,
        startTime: 0,
        endTime: Math.min(5, maxDuration), // Default to 5 seconds or max duration
        duration: 0, // Will be updated once metadata is loaded
      };
      return newClips;
    });

    setActiveVideoIndex(index);

    // Wait for the next render cycle before trying to access the video element
    setTimeout(() => {
      const videoEl = videoRefs.current[index];
      if (videoEl) {
        // Set up a one-time event listener for metadata
        const handleMetadata = () => {
          const videoDuration = videoEl.duration;

          setVideoClips((prev) => {
            const newClips = [...prev];
            newClips[index] = {
              ...newClips[index],
              endTime: Math.min(maxDuration, videoDuration),
              duration: videoDuration,
            };
            return newClips;
          });

          // Remove the event listener once fired
          videoEl.removeEventListener("loadedmetadata", handleMetadata);
        };

        videoEl.addEventListener("loadedmetadata", handleMetadata);
      }
    }, 100);
  };

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
      if (gifUrl) {
        URL.revokeObjectURL(gifUrl);
      }
    };
  }, []);

  // Update video time when slider changes
  const updateVideoTime = (index: number, time: number) => {
    if (videoRefs.current[index]) {
      videoRefs.current[index]!.currentTime = time;
    }
  };

  // Handle slider changes for start time
  const handleStartTimeChange = (index: number, value: number) => {
    setVideoClips((prev) => {
      const newClips = [...prev];
      const clip = { ...newClips[index] };

      // Ensure start time is less than end time
      const newStartTime = Math.min(value, clip.endTime - 0.1);
      clip.startTime = newStartTime;

      newClips[index] = clip;
      updateVideoTime(index, newStartTime);
      return newClips;
    });
  };

  // Handle slider changes for end time
  const handleEndTimeChange = (index: number, value: number) => {
    setVideoClips((prev) => {
      const newClips = [...prev];
      const clip = { ...newClips[index] };

      // Ensure end time is greater than start time
      const newEndTime = Math.max(value, clip.startTime + 0.1);
      clip.endTime = newEndTime;

      newClips[index] = clip;
      updateVideoTime(index, newEndTime);
      return newClips;
    });
  };

  // Format time in MM:SS format
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Play/Pause the active video
  const togglePlayPause = () => {
    if (activeVideoIndex === null || !videoRefs.current[activeVideoIndex])
      return;

    const video = videoRefs.current[activeVideoIndex];

    if (isPlaying) {
      video?.pause();
      setIsPlaying(false);
    } else {
      // Set video to start time and play
      if (video) {
        try {
          // Make sure video is ready to play
          video.currentTime = videoClips[activeVideoIndex].startTime;

          // Force immediate play attempt
          const playAttempt = video.play();
          if (playAttempt) {
            playAttempt
              .then(() => {
                setIsPlaying(true);
                console.log("Video playing successfully");
              })
              .catch((err) => {
                console.error("Play error:", err);
                setIsPlaying(false);
              });
          } else {
            setIsPlaying(true);
          }
        } catch (err) {
          console.error("Error during play attempt:", err);
          setIsPlaying(false);
        }
      }
    }
  };

  // Handle video playback reaching the end time
  useEffect(() => {
    if (activeVideoIndex === null) return;
    const video = videoRefs.current[activeVideoIndex];
    if (!video) return;

    let animationFrameId: number;

    const checkTime = () => {
      const { startTime, endTime } = videoClips[activeVideoIndex];
      if (video.currentTime >= endTime) {
        video.currentTime = startTime;
        video.play();
      }
      animationFrameId = requestAnimationFrame(checkTime);
    };

    if (videoClips[activeVideoIndex].file) {
      video.currentTime = videoClips[activeVideoIndex].startTime;
      video.play().catch(console.error);
      animationFrameId = requestAnimationFrame(checkTime);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeVideoIndex, videoClips]);

  // Reset video refs when template changes
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, totalCells);
    while (videoRefs.current.length < totalCells) {
      videoRefs.current.push(null);
    }

    // Reset GIF URL when template changes
    setGifUrl(null);
  }, [totalCells]);

  // Function to create GIF
  const createGif = async () => {
    if (!ffmpeg || !ffmpeg.isLoaded()) {
      console.error("FFmpeg not loaded");
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setGifUrl(null);

    try {
      const validClips = videoClips.filter((clip) => clip.file);
      if (validClips.length === 0) throw new Error("No video clips with files");

      // Choose layout based on videoClips.length or a selected layout
      const clipCount = validClips.length;
      // Example: dynamically select layout, replace with your actual selection
      let layout: Layout = "Single";
      if (selectedTemplate && templates[selectedTemplate]) {
        layout = templates[selectedTemplate].name as Layout;
      }
      // Limit clips to max needed for layout
      const clipsToUse = validClips.slice(
        0,
        layout === "2x2 Grid" ? 4 : clipCount
      );

      // Write all clips to FS
      for (let i = 0; i < clipsToUse.length; i++) {
        const clip = clipsToUse[i];
        const data = await fetchFile(clip.file!);
        ffmpeg.FS("writeFile", `input${i}.mp4`, data);
      }

      // Determine durations (use shortest trimmed duration across clips)
      const durations = clipsToUse.map((c) =>
        Math.min(maxDuration, c.endTime - c.startTime)
      );
      const duration = Math.min(...durations);

      setProcessingProgress(20);

      // Build input args with trimming for palette gen
      const paletteInputs: string[] = [];
      for (let i = 0; i < clipsToUse.length; i++) {
        paletteInputs.push("-ss", String(clipsToUse[i].startTime));
        paletteInputs.push("-t", String(duration));
        paletteInputs.push("-i", `input${i}.mp4`);
      }

      // Palette generation
      await ffmpeg.run(
        ...paletteInputs,
        "-filter_complex",
        createFilterComplex(layout, clipsToUse.length, fps),
        "-map",
        "[p]",
        "-y",
        "palette.png"
      );

      setProcessingProgress(60);

      // Build input args with trimming for GIF creation (palette is extra input)
      const gifInputs: string[] = [];
      for (let i = 0; i < clipsToUse.length; i++) {
        gifInputs.push("-ss", String(clipsToUse[i].startTime));
        gifInputs.push("-t", String(duration));
        gifInputs.push("-i", `input${i}.mp4`);
      }
      gifInputs.push("-i", "palette.png"); // palette input

      await ffmpeg.run(
        ...gifInputs,
        "-filter_complex",
        createUseFilterComplex(layout, clipsToUse.length, fps),
        "-loop",
        "0",
        "-y",
        "output.gif"
      );

      setProcessingProgress(90);

      // Read result
      const data = ffmpeg.FS("readFile", "output.gif");
      const gifBlob = new Blob([new Uint8Array(data.buffer)], {
        type: "image/gif",
      });
      const url = URL.createObjectURL(gifBlob);
      setGifUrl(url);

      // Extract frames from the GIF
      extractGifFrames(gifBlob);

      // Cleanup
      for (let i = 0; i < clipsToUse.length; i++) {
        ffmpeg.FS("unlink", `input${i}.mp4`);
      }
      ffmpeg.FS("unlink", "palette.png");
      ffmpeg.FS("unlink", "output.gif");

      setProcessingProgress(100);
    } catch (err) {
      console.error("GIF creation error:", err);
      setError(
        `Failed to create GIF: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to read files
  const fetchFile = async (file: File): Promise<Uint8Array> => {
    return new Uint8Array(await file.arrayBuffer());
  };

  // Function to download the generated GIF
  const downloadGif = () => {
    if (!gifUrl) return;

    const link = document.createElement("a");
    link.href = gifUrl;
    link.download = `OnlyFans_${selectedTemplate}_${new Date().getTime()}.gif`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================== GIF Blur Processing ==================
  console.log(gifFrames);
  // Extract frames from GIF
  const extractGifFrames = async (gifBlob: Blob) => {
    if (!gifBlob) {
      console.error("No GIF blob provided");
      return;
    }

    setIsGifProcessing(true);
    setGifFrames([]);
    setCurrentFrameIndex(0);
    setIsGifLoaded(false);

    try {
      const arrayBuffer = await gifBlob.arrayBuffer();
      const gif = parseGIF(arrayBuffer);
      const frames = decompressFrames(gif, true);

      // Get GIF dimensions from logical screen descriptor
      const gifWidth = gif.lsd?.width || 1;
      const gifHeight = gif.lsd?.height || 1;

      // Store both the original frame data and the rendered compositions
      const extractedFrames: ImageData[] = [];
      const originalFrameData: {
        patch: Uint8ClampedArray;
        dims: { width: number; height: number; left: number; top: number };
        disposalType: number;
        delay: number;
        transparentIndex?: number;
      }[] = [];

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = gifWidth;
      tempCanvas.height = gifHeight;

      const ctx = tempCanvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Save a backup of canvas state for disposal method 3
      let prevCanvasState: ImageData | null = null;

      // Process each frame with proper disposal handling
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];

        if (!frame.patch || frame.patch.length === 0) {
          console.warn(`Skipping frame ${i} due to missing patch data`);
          continue;
        }

        try {
          const frameWidth = frame.dims.width;
          const frameHeight = frame.dims.height;
          const frameLeft = frame.dims.left;
          const frameTop = frame.dims.top;

          // Save original frame data for reconstruction
          originalFrameData.push({
            patch: new Uint8ClampedArray(frame.patch),
            dims: {
              width: frameWidth,
              height: frameHeight,
              left: frameLeft,
              top: frameTop,
            },
            disposalType: frame.disposalType,
            delay: frame.delay,
            transparentIndex: frame.transparentIndex,
          });

          // Handle frame disposal from previous frame
          if (i > 0) {
            const prevFrame = frames[i - 1];

            switch (prevFrame.disposalType) {
              case 2: // Restore to background (clear previous frame area)
                ctx.clearRect(
                  prevFrame.dims.left,
                  prevFrame.dims.top,
                  prevFrame.dims.width,
                  prevFrame.dims.height
                );
                break;
              case 3: // Restore to previous
                if (prevCanvasState) {
                  ctx.putImageData(prevCanvasState, 0, 0);
                }
                break;
              // Case 0 and 1: Do nothing, leave the canvas as is
            }
          } else {
            // First frame, clear canvas
            ctx.clearRect(0, 0, gifWidth, gifHeight);
          }

          // Save canvas state if the next frame uses disposal method 3
          if (frame.disposalType === 3) {
            prevCanvasState = ctx.getImageData(0, 0, gifWidth, gifHeight);
          }

          // Create a separate canvas for the current frame
          const frameCanvas = document.createElement("canvas");
          frameCanvas.width = frameWidth;
          frameCanvas.height = frameHeight;
          const frameCtx = frameCanvas.getContext("2d");

          if (!frameCtx) {
            throw new Error("Could not get frame canvas context");
          }

          // Put frame data onto the frame canvas
          const imageData = new ImageData(
            new Uint8ClampedArray(frame.patch),
            frameWidth,
            frameHeight
          );
          frameCtx.putImageData(imageData, 0, 0);

          // Draw frame onto the main canvas
          ctx.drawImage(frameCanvas, frameLeft, frameTop);

          // Get the composed frame
          const composedFrame = ctx.getImageData(0, 0, gifWidth, gifHeight);
          extractedFrames.push(composedFrame);
        } catch (frameError) {
          console.error(`Error processing frame ${i}:`, frameError);
        }
      }

      if (extractedFrames.length === 0) {
        throw new Error("No valid frames could be extracted from the GIF");
      }

      // Store the original frame data for later reconstruction
      setOriginalGifData({
        frames: originalFrameData,
        width: gifWidth,
        height: gifHeight,
        globalColorTable: gif.gct ? gif.gct.flat() : null,
      });

      setGifFrames(extractedFrames);
      displayFrame(0);
      setIsGifLoaded(true);
    } catch (error) {
      console.error("Error extracting GIF frames:", error);
      setError(
        "Failed to process GIF. The file may be corrupted or unsupported."
      );
      setGifFrames([]);
      setCurrentFrameIndex(0);
    } finally {
      setIsGifProcessing(false);
    }
  };

  // Display a specific frame
  const displayFrame = (index: number) => {
    // Validate frames array exists and has content
    if (!Array.isArray(gifFrames)) {
      console.error("gifFrames is not an array");
      return;
    }

    if (gifFrames.length === 0) {
      console.error("No frames available to display");
      return;
    }

    // Validate index is within bounds
    const safeIndex = Math.max(0, Math.min(index, gifFrames.length - 1));
    if (index !== safeIndex) {
      console.warn(`Adjusted frame index from ${index} to ${safeIndex}`);
      index = safeIndex;
    }

    const canvas = canvasBlurRef.current;
    if (!canvas) {
      console.error("Canvas ref not available");
      return;
    }

    const frame = gifFrames[index];
    if (!frame || !frame.data || frame.data.length === 0) {
      console.error("Invalid frame data at index", index);
      return;
    }

    // Ensure we have valid dimensions
    const frameWidth = Math.max(1, frame.width || 1);
    const frameHeight = Math.max(1, frame.height || 1);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }

    // Set canvas dimensions
    canvas.width = frameWidth;
    canvas.height = frameHeight;

    // Update mask canvas dimensions to match
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      maskCanvas.width = frameWidth;
      maskCanvas.height = frameHeight;
    }

    // Draw frame
    ctx.putImageData(frame, 0, 0);
    setCurrentFrameIndex(index);
  };

  // Apply blur to current frame
  const applyBlurToCurrentFrame = () => {
    if (
      !gifFrames.length ||
      currentFrameIndex < 0 ||
      currentFrameIndex >= gifFrames.length
    )
      return;

    const canvas = canvasBlurRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
    if (!maskCtx) return;

    // Get the mask data
    const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);

    // Create a copy of the current frame
    const frameData = new ImageData(
      new Uint8ClampedArray(gifFrames[currentFrameIndex].data),
      gifFrames[currentFrameIndex].width,
      gifFrames[currentFrameIndex].height
    );

    // Apply blur based on mask
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;

        // If pixel is in the mask (non-transparent)
        if (maskData.data[i + 3] > 0) {
          if (blurType === "pixelated") {
            applyPixelatedBlur(x, y, frameData);
          } else if (blurType === "gaussian") {
            applyGaussianBlur(x, y, frameData);
          } else if (blurType === "mosaic") {
            applyMosaicBlur(x, y, frameData);
          }
        }
      }
    }

    // Update the frame in our array
    const updatedFrames = [...gifFrames];
    updatedFrames[currentFrameIndex] = frameData;
    setGifFrames(updatedFrames);

    // Display the updated frame
    ctx.putImageData(frameData, 0, 0);
  };

  // Process all frames with the current mask
  const processAllFrames = async () => {
    if (!gifFrames.length) return;

    setIsGifProcessing(true);

    try {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;

      const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
      if (!maskCtx) return;

      // Get the mask data once (assumes same mask for all frames)
      const maskData = maskCtx.getImageData(
        0,
        0,
        maskCanvas.width,
        maskCanvas.height
      );

      const processedFrames = await Promise.all(
        gifFrames.map((frame) => {
          return new Promise<ImageData>((resolve) => {
            const frameData = new ImageData(
              new Uint8ClampedArray(frame.data),
              frame.width,
              frame.height
            );

            // Apply blur based on mask
            for (let y = 0; y < frame.height; y++) {
              for (let x = 0; x < frame.width; x++) {
                const i = (y * frame.width + x) * 4;

                // If pixel is in the mask (white)
                if (maskData.data[i + 3] > 0) {
                  if (blurType === "pixelated") {
                    applyPixelatedBlur(x, y, frameData);
                  } else if (blurType === "gaussian") {
                    applyGaussianBlur(x, y, frameData);
                  } else if (blurType === "mosaic") {
                    applyMosaicBlur(x, y, frameData);
                  }
                }
              }
            }

            resolve(frameData);
          });
        })
      );

      setGifFrames(processedFrames);
      displayFrame(currentFrameIndex);
    } catch (error) {
      console.error("Error processing frames:", error);
      setError("Failed to process all frames");
    } finally {
      setIsGifProcessing(false);
    }
  };
  interface OriginalGifData {
    frames: {
      patch: Uint8ClampedArray;
      dims: {
        width: number;
        height: number;
        left: number;
        top: number;
      };
      disposalType: number;
      delay: number;
      transparentIndex?: number;
    }[];
    width: number;
    height: number;
    globalColorTable: number[] | null;
  }

  // Add this state variable to your component
  const [originalGifData, setOriginalGifData] =
    useState<OriginalGifData | null>(null);

  // // Example of how to apply blur to all frames
  // const applyBlurToFrames = () => {
  //   if (!gifFrames.length) return;

  //   setIsProcessing(true);

  //   try {
  //     const blurredFrames = gifFrames.map((frame) => {
  //       const canvas = document.createElement("canvas");
  //       canvas.width = frame.width;
  //       canvas.height = frame.height;

  //       const ctx = canvas.getContext("2d", { willReadFrequently: true });
  //       if (!ctx) throw new Error("Could not get canvas context");

  //       // Draw the frame to the canvas
  //       ctx.putImageData(frame, 0, 0);

  //       // Apply blur using CSS filter
  //       ctx.filter = `blur(${blurAmount}px)`;

  //       // Draw the frame again to apply the filter
  //       // Need to use a temp canvas because filters can't be applied directly to ImageData
  //       const tempCanvas = document.createElement("canvas");
  //       tempCanvas.width = frame.width;
  //       tempCanvas.height = frame.height;

  //       const tempCtx = tempCanvas.getContext("2d");
  //       if (!tempCtx) throw new Error("Could not get temp canvas context");

  //       tempCtx.putImageData(frame, 0, 0);

  //       // Clear and redraw with filter
  //       ctx.clearRect(0, 0, canvas.width, canvas.height);
  //       ctx.drawImage(tempCanvas, 0, 0);

  //       // Reset filter
  //       ctx.filter = "none";

  //       // Get the blurred ImageData
  //       return ctx.getImageData(0, 0, frame.width, frame.height);
  //     });

  //     setGifFrames(blurredFrames);

  //     // Update the current frame display
  //     if (currentFrameIndex < blurredFrames.length) {
  //       displayFrame(currentFrameIndex);
  //     } else {
  //       displayFrame(0);
  //     }
  //   } catch (error) {
  //     console.error("Error applying blur:", error);
  //     setError(
  //       `Failed to apply blur: ${
  //         error instanceof Error ? error.message : String(error)
  //       }`
  //     );
  //   } finally {
  //     setIsProcessing(false);
  //   }
  // };

  // Reconstruct GIF from processed frames
  const reconstructGif = async () => {
    if (!gifFrames.length || !originalGifData) {
      console.error("No frames or original data to reconstruct");
      return;
    }

    setIsGifProcessing(true);

    try {
      // Use the original GIF dimensions
      const width = originalGifData.width;
      const height = originalGifData.height;

      // Create a new GIF instance with configuration matching the original
      const gif = new GIF({
        workers: 4,
        quality: quality,
        width: width,
        height: height,
        workerScript: "/gif.worker.js",
        dither: false, // Set to false or "FloydSteinberg" if you want dithering
        transparent: "auto", // Enable transparency handling
        debug: false,
        repeat: 0, // Loop forever
      });

      // Create canvas for drawing and applying effects
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        throw new Error("Could not get canvas context");
        return;
      }

      // Create frame canvas for reconstructing individual frames
      const frameCanvas = document.createElement("canvas");
      const frameCtx = frameCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      if (!frameCtx) {
        throw new Error("Could not get frame canvas context");
        return;
      }

      // Track current canvas state for proper frame composition
      let prevCanvasState: ImageData | null = null;

      // Process each frame
      for (let i = 0; i < gifFrames.length; i++) {
        // Reset the main canvas for this frame's composition
        if (i > 0) {
          const prevFrameData = originalGifData.frames[i - 1];

          switch (prevFrameData.disposalType) {
            case 2: // Restore to background
              ctx.clearRect(
                prevFrameData.dims.left,
                prevFrameData.dims.top,
                prevFrameData.dims.width,
                prevFrameData.dims.height
              );
              break;
            case 3: // Restore to previous
              if (prevCanvasState) {
                ctx.putImageData(prevCanvasState, 0, 0);
              }
              break;
            // Cases 0 and 1: Do nothing, leave as is
          }
        } else {
          // First frame, clear the canvas
          ctx.clearRect(0, 0, width, height);
        }

        // Save state if needed for next frame
        if (originalGifData.frames[i].disposalType === 3) {
          prevCanvasState = ctx.getImageData(0, 0, width, height);
        }

        // Get current frame data and dimensions
        const currentFrameData = originalGifData.frames[i];
        const frameWidth = currentFrameData.dims.width;
        const frameHeight = currentFrameData.dims.height;
        const frameLeft = currentFrameData.dims.left;
        const frameTop = currentFrameData.dims.top;

        // Resize frame canvas to current frame dimensions
        frameCanvas.width = frameWidth;
        frameCanvas.height = frameHeight;

        // Create a new ImageData from our modified frame
        // Use the edited frame data from gifFrames
        const modifiedFrame = gifFrames[i];

        // Extract just the portion of the modified frame that corresponds to this frame's position
        const extractedRegion = new ImageData(
          new Uint8ClampedArray(frameWidth * frameHeight * 4),
          frameWidth,
          frameHeight
        );

        // Copy pixel data from the modified full frame to the extract region
        for (let y = 0; y < frameHeight; y++) {
          for (let x = 0; x < frameWidth; x++) {
            const srcPos = ((frameTop + y) * width + (frameLeft + x)) * 4;
            const destPos = (y * frameWidth + x) * 4;

            // Copy RGBA values
            extractedRegion.data[destPos] = modifiedFrame.data[srcPos];
            extractedRegion.data[destPos + 1] = modifiedFrame.data[srcPos + 1];
            extractedRegion.data[destPos + 2] = modifiedFrame.data[srcPos + 2];
            extractedRegion.data[destPos + 3] = modifiedFrame.data[srcPos + 3];
          }
        }

        // Draw the frame with any applied effects (like blur)
        frameCtx.putImageData(extractedRegion, 0, 0);

        // Draw the frame to the main canvas
        ctx.drawImage(frameCanvas, frameLeft, frameTop);

        // Add frame to the GIF
        gif.addFrame(ctx, {
          delay: currentFrameData.delay,
          copy: true,
          dispose: currentFrameData.disposalType,
        });
      }

      // Handle rendering completion
      gif.on("finished", (blob: Blob) => {
        // Clean up previous URL if it exists
        if (gifUrl) {
          URL.revokeObjectURL(gifUrl);
        }

        const url = URL.createObjectURL(blob);
        setGifUrl(url);
        setIsGifProcessing(false);
        console.log("GIF successfully reconstructed");
      });

      // Handle rendering progress
      gif.on("progress", (p: number) => {
        console.log(`GIF rendering progress: ${Math.round(p * 100)}%`);
      });

      // Handle rendering errors
      gif.on("abort", () => {
        console.error("GIF rendering aborted");
        setError("GIF rendering was aborted");
        setIsGifProcessing(false);
      });

      gif.render();
    } catch (error) {
      console.error("Error reconstructing GIF:", error);
      setError(
        `Failed to reconstruct GIF: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      setIsGifProcessing(false);
    }
  };
  // Blur functions
  const applyGaussianBlur = (x: number, y: number, imageData: ImageData) => {
    const intensity = blurIntensity;
    const radius = Math.floor(intensity / 2);
    let r = 0,
      g = 0,
      b = 0,
      a = 0,
      count = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = Math.min(Math.max(x + dx, 0), imageData.width - 1);
        const ny = Math.min(Math.max(y + dy, 0), imageData.height - 1);
        const ni = (ny * imageData.width + nx) * 4;

        r += imageData.data[ni];
        g += imageData.data[ni + 1];
        b += imageData.data[ni + 2];
        a += imageData.data[ni + 3];
        count++;
      }
    }

    const i = (y * imageData.width + x) * 4;
    imageData.data[i] = r / count;
    imageData.data[i + 1] = g / count;
    imageData.data[i + 2] = b / count;
    imageData.data[i + 3] = a / count;
  };

  const applyPixelatedBlur = (x: number, y: number, imageData: ImageData) => {
    const blockSize = Math.max(1, Math.floor(blurIntensity / 2));
    const blockX = Math.floor(x / blockSize) * blockSize;
    const blockY = Math.floor(y / blockSize) * blockSize;

    const baseI = (blockY * imageData.width + blockX) * 4;
    const r = imageData.data[baseI];
    const g = imageData.data[baseI + 1];
    const b = imageData.data[baseI + 2];
    const a = imageData.data[baseI + 3];

    const i = (y * imageData.width + x) * 4;
    imageData.data[i] = r;
    imageData.data[i + 1] = g;
    imageData.data[i + 2] = b;
    imageData.data[i + 3] = a;
  };

  const applyMosaicBlur = (x: number, y: number, imageData: ImageData) => {
    const blockSize = Math.max(1, Math.floor(blurIntensity / 2));
    const blockX = Math.floor(x / blockSize) * blockSize;
    const blockY = Math.floor(y / blockSize) * blockSize;

    let r = 0,
      g = 0,
      b = 0,
      a = 0,
      count = 0;

    for (let dy = 0; dy < blockSize && blockY + dy < imageData.height; dy++) {
      for (let dx = 0; dx < blockSize && blockX + dx < imageData.width; dx++) {
        const nx = blockX + dx;
        const ny = blockY + dy;
        const ni = (ny * imageData.width + nx) * 4;

        r += imageData.data[ni];
        g += imageData.data[ni + 1];
        b += imageData.data[ni + 2];
        a += imageData.data[ni + 3];
        count++;
      }
    }

    const avgR = r / count;
    const avgG = g / count;
    const avgB = b / count;
    const avgA = a / count;

    const i = (y * imageData.width + x) * 4;
    imageData.data[i] = avgR;
    imageData.data[i + 1] = avgG;
    imageData.data[i + 2] = avgB;
    imageData.data[i + 3] = avgA;
  };

  // Handle drawing on the mask
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasBlurRef.current;
    if (!canvas) return;

    // Initialize mask canvas if not already done
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        maskCtx.fillStyle = "rgba(0,0,0,0)"; // Transparent background
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    }

    setIsDrawing(true);
    drawMask(getMousePos(e));
    processAllFrames();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (isGifLoaded) {
        applyBlurToCurrentFrame();
      }
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvas) return;
    drawMask(getMousePos(e));
  };

  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasBlurRef.current) return { x: 0, y: 0 };
    const rect = canvasBlurRef.current.getBoundingClientRect();

    // Get position considering touch or mouse events
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * (canvasBlurRef.current.width / rect.width),
      y: (clientY - rect.top) * (canvasBlurRef.current.height / rect.height),
    };
  };

  const drawMask = (pos: { x: number; y: number }) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    // Set drawing properties
    maskCtx.globalCompositeOperation = "source-over";
    maskCtx.fillStyle = "white";
    maskCtx.beginPath();
    maskCtx.arc(pos.x, pos.y, brushSize, 0, Math.PI * 2);
    maskCtx.fill();

    // Immediately apply blur to the current frame
    applyBlurToCurrentFrame();
  };

  const clearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    // Clear the mask
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Reset to transparent
    maskCtx.fillStyle = "rgba(0,0,0,0)";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Redisplay the original frame
    if (isGifLoaded && gifFrames.length > 0) {
      const originalFrame = gifFrames[currentFrameIndex];
      const canvas = canvasBlurRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.putImageData(originalFrame, 0, 0);
        }
      }
    }
  };

  // // When navigating frames
  // const goToPreviousFrame = () => {
  //   if (gifFrames.length > 0) {
  //     const newIndex = Math.max(0, currentFrameIndex - 1);
  //     displayFrame(newIndex);
  //   }
  // };

  // const goToNextFrame = () => {
  //   if (gifFrames.length > 0) {
  //     const newIndex = Math.min(gifFrames.length - 1, currentFrameIndex + 1);
  //     displayFrame(newIndex);
  //   }
  // };

  // const downloadProcessedGif = () => {
  //   if (!gifUrl) return;

  //   const link = document.createElement("a");
  //   link.href = gifUrl;
  //   link.download = `OnlyFans_blurred_${new Date().getTime()}.gif`;
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };

  return (
    <div className="min-h-screen bg-black/20 text-white p-6 rounded-lg">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          OnlyFans GIF Maker
        </h1>
        <p className="text-gray-300 mt-2">
          Create stunning GIFs for OnlyFans content!
        </p>
      </header>

      {/* Model Selection (placeholder) */}
      <div className="bg-gray-800/50 rounded-xl p-6 mb-4 shadow-lg border border-gray-700/50 backdrop-blur-sm">
        <h2 className="text-xl font-semibold mb-4 text-blue-300">
          Select Model
        </h2>
        {/* ModelsDropdown component would go here */}
        <div className="bg-gray-700 p-3 rounded-lg">
          <p className="text-gray-300">Model selection placeholder</p>
        </div>
      </div>

      {/* Template Selection */}
      <div className="bg-gray-800/50 rounded-xl p-6 mb-4 shadow-lg border border-gray-700/50 backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-blue-300">GIF Template</h2>
        <p className="text-gray-300 mb-4">Choose a template for your GIF.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {Object.keys(templates).map((key) => (
            <button
              key={key}
              onClick={() => {
                setSelectedTemplate(key);
                setVideoClips(
                  Array(templates[key].cols * templates[key].rows).fill({
                    file: null,
                    startTime: 0,
                    endTime: 5,
                    duration: 0,
                  })
                );
                setActiveVideoIndex(null);
              }}
              className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                selectedTemplate === key
                  ? "bg-blue-600 text-white ring-2 ring-blue-400"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {templates[key].icon}
              <span className="text-xs mt-2">{templates[key].name}</span>
            </button>
          ))}
        </div>

        {/* Grid Preview with Clickable Inputs */}
        <div className="mb-6">
          <h3 className="text-gray-300 mb-2 font-medium">Preview</h3>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
            <div
              ref={outputGridRef}
              className="grid aspect-video"
              style={{
                gridTemplateColumns: `repeat(${templates[selectedTemplate].cols}, 1fr)`,
                gridTemplateRows: `repeat(${templates[selectedTemplate].rows}, 1fr)`,
              }}
            >
              {Array.from({ length: totalCells }).map((_, i) => (
                <div key={i} className="relative">
                  <label
                    className={`relative bg-gray-700 w-full h-full flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-600 transition overflow-hidden ${
                      activeVideoIndex === i ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    {videoClips[i].file ? (
                      <>
                        <video
                          ref={(el) => {
                            if (!el) return;
                            videoRefs.current[i] = el;

                            const clip = videoClips[i];
                            const startPlayback = () => {
                              el.currentTime = clip.startTime;
                              el.play().catch(() => {});
                              requestAnimationFrame(checkLoop);
                            };

                            const checkLoop = () => {
                              if (el.currentTime >= clip.endTime) {
                                el.currentTime = clip.startTime;
                                el.play().catch(() => {});
                              }
                              requestAnimationFrame(checkLoop);
                            };

                            const handleLoaded = () => {
                              startPlayback();
                              el.removeEventListener(
                                "loadeddata",
                                handleLoaded
                              );
                            };

                            el.addEventListener("loadeddata", handleLoaded);
                          }}
                          src={
                            videoClips[i].file
                              ? URL.createObjectURL(videoClips[i].file)
                              : ""
                          }
                          className="object-cover w-full h-full"
                          preload="metadata"
                          playsInline
                          autoPlay
                          muted
                        />

                        {/* Edit button overlay */}
                        <button
                          className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full z-10"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveVideoIndex(i);
                            setIsPlaying(false);
                            // Scroll to timeframe editor
                            document
                              .getElementById("timeframe-editor")
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              });
                          }}
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-sm flex items-center">
                        <Clock className="w-4 h-4 mr-1" /> Upload video
                      </span>
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) =>
                        handleVideoChange(
                          i,
                          e.target.files ? e.target.files[0] : null
                        )
                      }
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeframe Editor */}
        {activeVideoIndex !== null && videoClips[activeVideoIndex]?.file && (
          <div
            id="timeframe-editor"
            className="bg-gray-900 p-4 rounded-lg border border-gray-700 mb-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-blue-300 font-medium">Edit Timeframe</h3>
              <button
                onClick={togglePlayPause}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>
                Total: {formatTime(videoClips[activeVideoIndex].duration)}
              </span>
              <span>
                Clip:{" "}
                {formatTime(
                  videoClips[activeVideoIndex].endTime -
                    videoClips[activeVideoIndex].startTime
                )}
              </span>
            </div>

            {/* Start Time */}
            <div className="mb-4">
              <label className="text-sm text-gray-300 mb-1 block">
                Start Time: {formatTime(videoClips[activeVideoIndex].startTime)}
              </label>
              <input
                type="range"
                min="0"
                max={videoClips[activeVideoIndex].duration}
                step="0.1"
                value={videoClips[activeVideoIndex].startTime}
                onChange={(e) =>
                  handleStartTimeChange(
                    activeVideoIndex,
                    parseFloat(e.target.value)
                  )
                }
                className="w-full accent-blue-500"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="text-sm text-gray-300 mb-1 block">
                End Time: {formatTime(videoClips[activeVideoIndex].endTime)}
              </label>
              <input
                type="range"
                min="0"
                max={videoClips[activeVideoIndex].duration}
                step="0.1"
                value={videoClips[activeVideoIndex].endTime}
                onChange={(e) =>
                  handleEndTimeChange(
                    activeVideoIndex,
                    parseFloat(e.target.value)
                  )
                }
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        )}

        {/* GIF Settings */}
        <div className="mb-6">
          <h3 className="text-gray-300 mb-2 font-medium">GIF Settings</h3>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
            <div className="mb-2">
              <label className="text-sm text-gray-300 mb-1 block">
                Maximum Duration (seconds): {maxDuration}s
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={maxDuration}
                onChange={(e) => setMaxDuration(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            <div className="mb-2">
              <label className="text-sm text-gray-300 mb-1 block">
                GIF Framerate: {fps} fps
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={fps}
                onChange={(e) => setFps(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Higher framerates result in smoother animation but larger file
                size
              </p>
            </div>

            <div className="mb-2">
              <label className="text-sm text-gray-300 mb-1 block">
                Quality: {quality}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Higher quality results in better image quality but larger file
                size
              </p>
            </div>
          </div>
        </div>

        {/* Generated GIF Preview */}
        {gifUrl && (
          <div className="mb-6">
            <h3 className="text-gray-300 mb-2 font-medium">Generated GIF</h3>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <div className="flex flex-col items-center">
                <img
                  src={gifUrl}
                  alt="Generated GIF"
                  className="max-w-full rounded-lg mb-4"
                />
                <button
                  onClick={downloadGif}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" /> Download GIF
                </button>
              </div>
            </div>

            {/* GIF Blur Editor */}
            <div className="mt-6 bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h3 className="text-gray-300 mb-4 font-medium">Blur Editor</h3>

              {/* Frame Navigation */}
              {/* {isGifLoaded && (
                <div className="flex justify-center items-center mb-4">
                  <button
                    onClick={goToPreviousFrame}
                    disabled={currentFrameIndex === 0 || gifFrames.length === 0}
                    className="p-2 rounded-full bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    onClick={goToNextFrame}
                    disabled={
                      currentFrameIndex === gifFrames.length - 1 ||
                      gifFrames.length === 0
                    }
                    className="p-2 rounded-full bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )} */}

              {/* Drawing canvas (visible) */}
              <div
                className="relative"
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
                    <label className="block mb-2 text-gray-300">
                      Blur Type
                    </label>
                    <select
                      value={blurType}
                      onChange={(e) => setBlurType(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300"
                    >
                      <option value="gaussian">Gaussian Blur</option>
                      <option value="pixelated">Pixelated</option>
                      <option value="mosaic">Mosaic</option>
                    </select>
                  </div>

                  {/* Blur intensity */}
                  <div>
                    <label className="block mb-2 text-gray-300">
                      Blur Intensity: {blurIntensity}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={blurIntensity}
                      onChange={(e) =>
                        setBlurIntensity(parseInt(e.target.value))
                      }
                      className="w-full accent-blue-500"
                    />
                  </div>

                  {/* Brush size */}
                  <div>
                    <label className="block mb-2 text-gray-300">
                      Brush Size: {brushSize}px
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-end space-x-2">
                    <button
                      onClick={clearMask}
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
                  </div>
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
                    <>
                      {/* <Download className="w-4 h-4 mr-2" /> */}
                      Proccess Blur GIF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg transition-colors"
            onClick={() => {
              // Reset form or navigate away logic
              if (gifUrl) {
                URL.revokeObjectURL(gifUrl);
                setGifUrl(null);
              }
            }}
          >
            Reset
          </button>
          <button
            className={`${
              isProcessing
                ? "bg-blue-800 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500"
            } text-white px-4 py-2 rounded-lg transition-colors flex items-center`}
            onClick={createGif}
            disabled={isProcessing || videoClips.every((clip) => !clip.file)}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing ({processingProgress}%)
              </>
            ) : (
              <>Create GIF</>
            )}
          </button>
        </div>
      </div>
      {/* Canvas for capturing frames */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default GifMaker;

// Create a non-SSR version of the component
export const ClientSideFFmpeg = dynamic(() => Promise.resolve(GifMaker), {
  ssr: false,
});
