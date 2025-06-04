"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Grid2X2,
  Columns2,
  Columns3,
  Square,
  Rows3,
  Download,
  Loader2,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import dynamic from "next/dynamic";
import { parseGIF, decompressFrames } from "gifuct-js";
import GIF from "gif.js";
import Cookies from "js-cookie";
import GifMakerVideoCropper from "./GifMakerVideoCropper";
import GifMakerEditorSelector from "./GIfMakerEditorSelector";
import ModelsDropdown from "./ModelsDropdown";
import { GifMakerVideoTimeline } from "./GifMakerVideoTimeline";
import GifMakerGifSettings from "./GifMakerGifSettings";
import ModelCaptionSelector from "./ModelCaptionSelector";


// Define TypeScript interfaces
interface ModelFormData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface VideoClip {
  file: File | null;
  startTime: number;
  endTime: number;
  duration: number;
  positionX?: number; // <-- must be optional or default to 0
  positionY?: number;
  scale?: number;
}

const BLUR_COOKIE_KEY = "blurSettings";
const GIF_COOKIE_KEY = "gifSettings";

const defaultBlurSettings: BlurSettings = {
  blurType: "gaussian",
  blurIntensity: 10,
  brushSize: 20,
};

const defaultGifSettings: GifSettings = {
  maxDuration: 5,
  fps: 15,
  quality: 10,
};

export const templates: Record<
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

const GifMaker = () => {
  const [formData, setFormData] = useState<ModelFormData>({});
  const [gifUrlHistory, setGifUrlHistory] = useState<string[]>([]);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("single");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [webhookData, setWebhookData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isGifSettingsOpen, setIsGifSettingsOpen] = useState(false);
  const [originalFrames, setOriginalFrames] = useState<ImageData[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string>("");
  const [vaultName, setVaultName] = useState<string>("");
  const [isPaid, setIsPaid] = useState<boolean>(false);

  useEffect(() => {
    if (formData.model && formData.model != "") {
      setVaultName(
        formData.model.toUpperCase() + "_" + (isPaid ? "PAID" : "FREE")
      );
    }
  }, [formData.model, isPaid]);

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (webhookData) {
      setGifUrl(`/api/be/proxy?path=${btoa(webhookData.filePath)}`);
      setGifUrlHistory((prev) => {
        const newHistory = [
          ...prev,
          `/api/be/proxy?path=${btoa(webhookData.filePath)}`,
        ];
        return newHistory;
      });
    }
  }, [webhookData]);

  const [blurSettings, setBlurSettings] = useState<BlurSettings>(() => {
    const cookie = Cookies.get(BLUR_COOKIE_KEY);
    if (cookie) {
      try {
        return { ...defaultBlurSettings, ...JSON.parse(cookie) };
      } catch {
        console.warn("Invalid cookie format for blur blurSettings");
      }
    }
    return defaultBlurSettings;
  });

  const [gifSettings, setGifSettings] = useState<GifSettings>(() => {
    const cookie = Cookies.get(GIF_COOKIE_KEY);
    if (cookie) {
      try {
        return { ...defaultGifSettings, ...JSON.parse(cookie) };
      } catch {
        console.warn("Invalid cookie format for blur blurSettings");
      }
    }
    return defaultGifSettings;
  });
  // Update cookie whenever blurSettings change
  useEffect(() => {
    Cookies.set(BLUR_COOKIE_KEY, JSON.stringify(blurSettings), {
      expires: 365, // 1 year
    });
  }, [blurSettings]);

  useEffect(() => {
    Cookies.set(GIF_COOKIE_KEY, JSON.stringify(gifSettings), {
      expires: 365, // 1 year
    });
  }, [gifSettings]);

  // GIF Blur Processing
  const [gifFrames, setGifFrames] = useState<ImageData[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isGifProcessing, setIsGifProcessing] = useState(false);
  const [isGifLoaded, setIsGifLoaded] = useState(false);

  const setBlurType = (type: BlurSettings["blurType"]) =>
    setBlurSettings((prev) => ({ ...prev, blurType: type }));

  const setBlurIntensity = (val: number) =>
    setBlurSettings((prev) => ({ ...prev, blurIntensity: val }));

  const setBrushSize = (val: number) =>
    setBlurSettings((prev) => ({ ...prev, brushSize: val }));

  const setMaxDuration = (val: number) =>
    setGifSettings((prev) => ({ ...prev, maxDuration: val }));

  const setFps = (val: number) =>
    setGifSettings((prev) => ({ ...prev, fps: val }));

  const setQuality = (val: number) =>
    setGifSettings((prev) => ({ ...prev, quality: val }));

  // Refs
  const canvasBlurRef = useRef<HTMLCanvasElement | null>(null);

  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas ref for capturing frames
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  // Additional ref for the output video grid
  const outputGridRef = useRef<HTMLDivElement>(null);
  const totalCells =
    templates[selectedTemplate].cols * templates[selectedTemplate].rows;

  const [videoClips, setVideoClips] = useState<VideoClip[]>(
    Array.from({ length: totalCells }, () => ({
      file: null,
      startTime: 0,
      endTime: 5,
      duration: 0,
      positionX: 0,
      positionY: 0,
      scale: 1,
    }))
  );

  const videoUrls = useMemo(() => {
    return videoClips.map((clip) =>
      clip.file ? URL.createObjectURL(clip.file) : null
    );
  }, [videoClips.map((clip) => clip.file?.name).join(",")]);

  const handleCurrentTimeChange = useCallback(
    (time: number) => {
      // Only update if the change is significant (more than 0.1 seconds)
      setCurrentTime((prevTime) => {
        if (Math.abs(prevTime - time) > 0.05) {
          // Update the video element directly
          if (activeVideoIndex !== null && videoRefs.current) {
            const activeVideo = videoRefs.current[activeVideoIndex];
            if (activeVideo && activeVideo.readyState >= 2) {
              activeVideo.currentTime = time;
            }
          }
          return time;
        }
        return prevTime;
      });
    },
    [activeVideoIndex]
  );
  // Add play/pause handler
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const createFilterComplex = (
    layout: Layout,
    clips: VideoClip[],
    fps: number
  ): string => {
    const { width, height } = dimensions;
    if (width === 0 || height === 0) {
      throw new Error("GIF dimensions are not set");
    }

    const clipCount = clips.length;

    const baseW =
      width /
      (layout === "Side by Side"
        ? 2
        : layout === "Horizontal Triptych"
        ? 3
        : layout === "2x2 Grid"
        ? 2
        : 1);
    const baseH =
      height /
      (layout === "Vertical Triptych" ? 3 : layout === "2x2 Grid" ? 2 : 1);

    const scale = (index: number) => {
      const clip = clips[index];
      const scaleFactor = clip.scale || 1;
      const scaledW = baseW * scaleFactor;
      const scaledH = baseH * scaleFactor;
      const offsetX = (scaledW - baseW) / 2 - (clip.positionX || 0);
      const offsetY = (scaledH - baseH) / 2 - (clip.positionY || 0);

      return `[${index}:v]scale=${scaledW}:${scaledH}:force_original_aspect_ratio=decrease,crop=${baseW}:${baseH}:${offsetX}:${offsetY}[v${index}];`;
    };

    const label = (i: number) => `[v${i}]`;

    if (layout === "Single") {
      const clip = clips[0];
      if (
        clipCount === 1 &&
        (clip.positionX !== 0 || clip.positionY !== 0 || clip.scale !== 1)
      ) {
        return scale(0) + `${label(0)}fps=${fps},palettegen=stats_mode=diff[p]`;
      }

      if (
        clipCount === 1 &&
        clip.positionX === 0 &&
        clip.positionY === 0 &&
        clip.scale === 1
      ) {
        return `fps=${fps},palettegen=stats_mode=diff[p]`;
      }

      throw new Error("Single layout must have exactly one clip");
    }

    if (layout === "Side by Side" && clipCount === 2) {
      return (
        scale(0) +
        scale(1) +
        `${label(0)}${label(
          1
        )}hstack=inputs=2,fps=${fps},palettegen=stats_mode=diff[p]`
      );
    }

    if (layout === "Horizontal Triptych" && clipCount === 3) {
      return (
        scale(0) +
        scale(1) +
        scale(2) +
        `${label(0)}${label(1)}${label(
          2
        )}hstack=inputs=3[v];[v]fps=${fps},palettegen=stats_mode=diff[p]`
      );
    }

    if (layout === "Vertical Triptych" && clipCount === 3) {
      return (
        scale(0) +
        scale(1) +
        scale(2) +
        `${label(0)}${label(1)}${label(
          2
        )}vstack=inputs=3[v];[v]fps=${fps},palettegen=stats_mode=diff[p]`
      );
    }

    if (layout === "2x2 Grid" && clipCount === 4) {
      const layoutStr = clips
        .map(
          (clip) =>
            `${Math.round((clip.positionX ?? 0) * baseW)}_${Math.round(
              (clip.positionY ?? 0) * baseH
            )}`
        )
        .join("|");

      return (
        scale(0) +
        scale(1) +
        scale(2) +
        scale(3) +
        `${label(0)}${label(1)}${label(2)}${label(
          3
        )}xstack=inputs=4:layout=${layoutStr},fps=${fps},palettegen=stats_mode=diff[p]`
      );
    }

    throw new Error(`Unsupported layout ${layout} for ${clipCount} clips`);
  };

  const createUseFilterComplex = (
    layout: Layout,
    clips: VideoClip[],
    fps: number
  ): string => {
    const { width, height } = dimensions;
    if (width === 0 || height === 0) {
      throw new Error("GIF dimensions are not set");
    }

    const clipCount = clips.length;

    const baseW =
      width /
      (layout === "Side by Side"
        ? 2
        : layout === "Horizontal Triptych"
        ? 3
        : layout === "2x2 Grid"
        ? 2
        : 1);
    const baseH =
      height /
      (layout === "Vertical Triptych" ? 3 : layout === "2x2 Grid" ? 2 : 1);

    const scale = (index: number) => {
      const clip = clips[index];
      const scaleFactor = clip.scale || 1;
      const scaledW = baseW * scaleFactor;
      const scaledH = baseH * scaleFactor;
      const offsetX = (scaledW - baseW) / 2 - (clip.positionX || 0);
      const offsetY = (scaledH - baseH) / 2 - (clip.positionY || 0);

      return `[${index}:v]scale=${scaledW}:${scaledH}:force_original_aspect_ratio=decrease,crop=${baseW}:${baseH}:${offsetX}:${offsetY}[v${index}];`;
    };

    const label = (i: number) => `[v${i}]`;

    if (layout === "Single") {
      const clip = clips[0];
      if (
        clipCount === 1 &&
        (clip.positionX !== 0 || clip.positionY !== 0 || clip.scale !== 1)
      ) {
        return (
          scale(0) + `${label(0)}fps=${fps}[x];[x][1:v]paletteuse=dither=bayer`
        );
      }

      if (
        clipCount === 1 &&
        clip.positionX === 0 &&
        clip.positionY === 0 &&
        clip.scale === 1
      ) {
        return `fps=${fps}[x];[x][1:v]paletteuse=dither=bayer`;
      }

      throw new Error("Single layout must have exactly one clip");
    }

    if (layout === "Side by Side" && clipCount === 2) {
      return (
        scale(0) +
        scale(1) +
        `${label(0)}${label(
          1
        )}hstack=inputs=2,fps=${fps}[x];[x][2:v]paletteuse=dither=bayer`
      );
    }

    if (layout === "Horizontal Triptych" && clipCount === 3) {
      return (
        scale(0) +
        scale(1) +
        scale(2) +
        `${label(0)}${label(1)}${label(
          2
        )}hstack=inputs=3,fps=${fps}[x];[x][3:v]paletteuse=dither=bayer`
      );
    }

    if (layout === "Vertical Triptych" && clipCount === 3) {
      return (
        scale(0) +
        scale(1) +
        scale(2) +
        `${label(0)}${label(1)}${label(
          2
        )}vstack=inputs=3,fps=${fps}[x];[x][3:v]paletteuse=dither=bayer`
      );
    }

    if (layout === "2x2 Grid" && clipCount === 4) {
      const layoutStr = clips
        .map(
          (clip) =>
            `${Math.round((clip.positionX ?? 0) * baseW)}_${Math.round(
              (clip.positionY ?? 0) * baseH
            )}`
        )
        .join("|");

      return (
        scale(0) +
        scale(1) +
        scale(2) +
        scale(3) +
        `${label(0)}${label(1)}${label(2)}${label(
          3
        )}xstack=inputs=4:layout=${layoutStr},fps=${fps}[x];[x][4:v]paletteuse=dither=bayer`
      );
    }

    throw new Error(`Unsupported layout ${layout} for ${clipCount} clips`);
  };

  // Function to create GIF
  const createGif = async () => {
    if (!ffmpeg || !ffmpeg.isLoaded()) {
      console.error("FFmpeg not loaded");
      return;
    }

    setGifUrl(null);
    setGifFrames([]);
    setCurrentFrameIndex(0);
    setIsGifLoaded(false);
    setOriginalGifData(null);
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      const validClips = videoClips.filter((clip) => clip.file);
      if (validClips.length === 0) throw new Error("No video clips with files");

      const clipCount = validClips.length;
      let layout: Layout = "Single";
      if (selectedTemplate && templates[selectedTemplate]) {
        layout = templates[selectedTemplate].name as Layout;
      }

      const clipsToUse = validClips.slice(
        0,
        layout === "2x2 Grid" ? 4 : clipCount
      );

      for (let i = 0; i < clipsToUse.length; i++) {
        const data = await fetchFile(clipsToUse[i].file!);
        ffmpeg.FS("writeFile", `input${i}.mp4`, data);
      }

      const durations = clipsToUse.map((c) =>
        Math.min(gifSettings.maxDuration, c.endTime - c.startTime)
      );
      const duration = Math.min(...durations);

      setProcessingProgress(20);

      const paletteInputs: string[] = [];
      for (let i = 0; i < clipsToUse.length; i++) {
        paletteInputs.push("-ss", String(clipsToUse[i].startTime));
        paletteInputs.push("-t", String(duration));
        paletteInputs.push("-i", `input${i}.mp4`);
      }

      await ffmpeg.run(
        ...paletteInputs,
        "-filter_complex",
        createFilterComplex(layout, clipsToUse, gifSettings.fps),
        "-map",
        "[p]",
        "-y",
        "palette.png"
      );

      setProcessingProgress(60);

      const gifInputs: string[] = [];
      for (let i = 0; i < clipsToUse.length; i++) {
        gifInputs.push("-ss", String(clipsToUse[i].startTime));
        gifInputs.push("-t", String(duration));
        gifInputs.push("-i", `input${i}.mp4`);
      }
      gifInputs.push("-i", "palette.png");

      await ffmpeg.run(
        ...gifInputs,
        "-filter_complex",
        createUseFilterComplex(layout, clipsToUse, gifSettings.fps),
        "-loop",
        "0",
        "-y",
        "output.gif"
      );

      setProcessingProgress(90);

      const data = ffmpeg.FS("readFile", "output.gif");
      const gifBlob = new Blob([new Uint8Array(data.buffer)], {
        type: "image/gif",
      });

      let width = dimensions.width;
      let height = dimensions.height;

      const shouldUseOriginalSize =
        layout === "Single" &&
        clipsToUse.length === 1 &&
        clipsToUse.every(
          (clip) =>
            clip.positionX === 0 && clip.positionY === 0 && clip.scale === 1
        );

      if (shouldUseOriginalSize) {
        // Dynamically extract size from the generated GIF
        const image = new Image();
        const gifUrl = URL.createObjectURL(gifBlob);
        await new Promise<void>((resolve, reject) => {
          image.onload = () => {
            width = image.width;
            height = image.height;
            URL.revokeObjectURL(gifUrl); // Clean up
            resolve();
          };
          image.onerror = reject;
          image.src = gifUrl;
        });
      }

      // Now safely use width and height
      if (width === 0 || height === 0) {
        throw new Error("GIF dimensions are not valid");
      }

      const canvas = canvasBlurRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }

      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        maskCanvas.width = width;
        maskCanvas.height = height;
        const maskCtx = maskCanvas.getContext("2d");
        if (maskCtx) {
          maskCtx.clearRect(0, 0, width, height);
          maskCtx.fillStyle = "rgba(0,0,0,0)";
          maskCtx.fillRect(0, 0, width, height);
        }
      }

      const url = URL.createObjectURL(gifBlob);
      setGifUrl(url);
      setGifUrlHistory((prev) => {
        const newHistory = [...prev, url];
        return newHistory;
      });
      await extractGifFrames(gifBlob, width, height);

      for (let i = 0; i < clipsToUse.length; i++) {
        ffmpeg.FS("unlink", `input${i}.mp4`);
      }
      ffmpeg.FS("unlink", "palette.png");
      ffmpeg.FS("unlink", "output.gif");

      setProcessingProgress(100);
      setError(null);
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

  const objectUrlsRef = useRef<string[]>([]);
  const handleVideoChange = (index: number, file: File | null) => {
    if (!file) return;

    // Clean up previous video URL if exists
    if (videoUrls[index]) {
      URL.revokeObjectURL(videoUrls[index]);
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(objectUrl);

    const tempVideo = document.createElement("video");
    tempVideo.src = objectUrl;

    tempVideo.addEventListener("loadedmetadata", () => {
      const videoDuration = tempVideo.duration;

      setVideoClips((prev) => {
        const newClips = [...prev];
        // Preserve existing start/end times if switching files on the same index
        const existingClip = newClips[index];
        const hasExistingTimes =
          existingClip &&
          existingClip.file &&
          existingClip.startTime !== 0 &&
          existingClip.endTime !== existingClip.duration;

        newClips[index] = {
          file: file,
          startTime: hasExistingTimes
            ? Math.min(existingClip.startTime, videoDuration)
            : 0,
          endTime: hasExistingTimes
            ? Math.min(existingClip.endTime, videoDuration)
            : Math.min(gifSettings.maxDuration, videoDuration),
          duration: videoDuration,
          positionX: existingClip?.positionX || 0,
          positionY: existingClip?.positionY || 0,
          scale: existingClip?.scale || 1,
        };
        return newClips;
      });

      tempVideo.remove();
      setActiveVideoIndex(index);
    });

    tempVideo.addEventListener("error", () => {
      console.error("Failed to load video metadata");
      tempVideo.remove();
      URL.revokeObjectURL(objectUrl);
      objectUrlsRef.current = objectUrlsRef.current.filter(
        (url) => url !== objectUrl
      );
    });
  };

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

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

  // Update video clips when timeline changes
  const handleStartTimeChange = useCallback(
    (time: number) => {
      setVideoClips((prev) => {
        const newClips = [...prev];
        if (activeVideoIndex !== null && newClips[activeVideoIndex]) {
          const clip = newClips[activeVideoIndex];

          // Clamp the new start time to valid bounds
          let newStartTime = Math.max(0, Math.min(time, clip.duration - 0.1));
          let newEndTime = clip.endTime;

          // Calculate current duration
          const currentDuration = clip.endTime - clip.startTime;

          // If we have a duration close to max, maintain it as a sliding window
          if (currentDuration >= gifSettings.maxDuration - 0.1) {
            // Maintain the max duration by moving end time with start time
            newEndTime = newStartTime + gifSettings.maxDuration;

            // If end time would exceed video duration, adjust both
            if (newEndTime > clip.duration) {
              newEndTime = clip.duration;
              newStartTime = Math.max(0, newEndTime - gifSettings.maxDuration);
            }
          } else {
            // Duration is less than max, just ensure we don't exceed max
            if (newEndTime - newStartTime > gifSettings.maxDuration) {
              newEndTime = newStartTime + gifSettings.maxDuration;
            }
          }

          // Final validation
          newStartTime = Math.max(
            0,
            Math.min(newStartTime, clip.duration - 0.1)
          );
          newEndTime = Math.max(
            newStartTime + 0.1,
            Math.min(newEndTime, clip.duration)
          );

          newClips[activeVideoIndex] = {
            ...clip,
            startTime: newStartTime,
            endTime: newEndTime,
          };
        }
        return newClips;
      });
    },
    [activeVideoIndex, gifSettings.maxDuration]
  );

  // Handle slider changes for end time
  const handleEndTimeChange = useCallback(
    (time: number) => {
      setVideoClips((prev) => {
        const newClips = [...prev];
        if (activeVideoIndex !== null && newClips[activeVideoIndex]) {
          const clip = newClips[activeVideoIndex];

          // Clamp the new end time to valid bounds
          let newEndTime = Math.max(0.1, Math.min(time, clip.duration));
          let newStartTime = clip.startTime;

          // Calculate current duration
          const currentDuration = clip.endTime - clip.startTime;

          // If we have a duration close to max, maintain it as a sliding window
          if (currentDuration >= gifSettings.maxDuration - 0.1) {
            // Maintain the max duration by moving start time with end time
            newStartTime = newEndTime - gifSettings.maxDuration;

            // If start time would go below 0, adjust both
            if (newStartTime < 0) {
              newStartTime = 0;
              newEndTime = Math.min(gifSettings.maxDuration, clip.duration);
            }
          } else {
            // Duration is less than max, just ensure we don't exceed max
            if (newEndTime - newStartTime > gifSettings.maxDuration) {
              newStartTime = newEndTime - gifSettings.maxDuration;
              if (newStartTime < 0) {
                newStartTime = 0;
                newEndTime = Math.min(gifSettings.maxDuration, clip.duration);
              }
            }
          }

          // Ensure minimum clip duration (0.1 seconds)
          if (newEndTime - newStartTime < 0.1) {
            if (newEndTime < clip.duration) {
              newEndTime = newStartTime + 0.1;
            } else {
              newStartTime = newEndTime - 0.1;
            }
          }

          // Final validation
          newStartTime = Math.max(0, newStartTime);
          newEndTime = Math.min(
            clip.duration,
            Math.max(newStartTime + 0.1, newEndTime)
          );

          newClips[activeVideoIndex] = {
            ...clip,
            startTime: newStartTime,
            endTime: newEndTime,
          };
        }
        return newClips;
      });
    },
    [activeVideoIndex, gifSettings.maxDuration]
  );

  // Reset video refs when template changes
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, totalCells);
    while (videoRefs.current.length < totalCells) {
      videoRefs.current.push(null);
    }

    // Reset GIF URL when template changes
    setGifUrl(null);
  }, [totalCells]);

  // Function to download the generated GIF
  const downloadGif = async () => {
    if (!gifUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(gifUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch the GIF");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `OnlyFans_${selectedTemplate}_${Date.now()}.gif`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // ================== GIF Blur Processing ==================

  // Extract frames from GIF

  // Update the extractGifFrames function
  const extractGifFrames = async (
    gifBlob: Blob,
    targetWidth: number,
    targetHeight: number
  ) => {
    // Reset all blur editor state
    setGifFrames([]);
    setOriginalFrames([]);
    setCurrentFrameIndex(0);
    setIsGifLoaded(false);

    // Clear mask canvas
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskCtx.fillStyle = "rgba(0,0,0,0)";
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    }

    if (!gifBlob) {
      console.error("No GIF blob provided");
      return;
    }

    setIsGifProcessing(true);

    try {
      const arrayBuffer = await gifBlob.arrayBuffer();
      const gif = parseGIF(arrayBuffer);
      const frames = decompressFrames(gif, true);

      // Get GIF dimensions from logical screen descriptor
      const gifWidth = gif.lsd?.width || 1;
      const gifHeight = gif.lsd?.height || 1;

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

      let prevCanvasState: ImageData | null = null;

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

          // Save original frame data
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

          // Handle frame disposal
          if (i > 0) {
            const prevFrame = frames[i - 1];
            switch (prevFrame.disposalType) {
              case 2:
                ctx.clearRect(
                  prevFrame.dims.left,
                  prevFrame.dims.top,
                  prevFrame.dims.width,
                  prevFrame.dims.height
                );
                break;
              case 3:
                if (prevCanvasState) {
                  ctx.putImageData(prevCanvasState, 0, 0);
                }
                break;
            }
          } else {
            ctx.clearRect(0, 0, gifWidth, gifHeight);
          }

          if (frame.disposalType === 3) {
            prevCanvasState = ctx.getImageData(0, 0, gifWidth, gifHeight);
          }

          const frameCanvas = document.createElement("canvas");
          frameCanvas.width = frameWidth;
          frameCanvas.height = frameHeight;
          const frameCtx = frameCanvas.getContext("2d");
          if (!frameCtx) continue;

          const imageData = new ImageData(
            new Uint8ClampedArray(frame.patch),
            frameWidth,
            frameHeight
          );
          frameCtx.putImageData(imageData, 0, 0);
          ctx.drawImage(frameCanvas, frameLeft, frameTop);

          // Only scale if necessary
          if (targetWidth !== gifWidth || targetHeight !== gifHeight) {
            const scaledCanvas = document.createElement("canvas");
            scaledCanvas.width = targetWidth;
            scaledCanvas.height = targetHeight;
            const scaledCtx = scaledCanvas.getContext("2d");
            if (!scaledCtx) continue;

            scaledCtx.drawImage(
              ctx.canvas,
              0,
              0,
              gifWidth,
              gifHeight,
              0,
              0,
              targetWidth,
              targetHeight
            );

            const croppedImageData = scaledCtx.getImageData(
              0,
              0,
              targetWidth,
              targetHeight
            );
            extractedFrames.push(croppedImageData);
          } else {
            // Use original dimensions
            const imageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
            extractedFrames.push(imageData);
          }
        } catch (frameError) {
          console.error(`Error processing frame ${i}:`, frameError);
        }
      }

      if (extractedFrames.length === 0) {
        throw new Error("No valid frames could be extracted from the GIF");
      }

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
    if (
      maskCanvas &&
      (maskCanvas.width !== frameWidth || maskCanvas.height !== frameHeight)
    ) {
      maskCanvas.width = frameWidth;
      maskCanvas.height = frameHeight;
    }

    // Draw frame
    ctx.putImageData(frame, 0, 0);
    setCurrentFrameIndex(index);
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
                  if (blurSettings.blurType === "pixelated") {
                    applyPixelatedBlur(x, y, frameData);
                  } else if (blurSettings.blurType === "gaussian") {
                    applyGaussianBlur(x, y, frameData);
                  } else if (blurSettings.blurType === "mosaic") {
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
        quality: gifSettings.quality,
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

        // Create a new ImageData from our modified frame.
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
        // // Clean up previous URL if it exists
        // if (gifUrl) {
        //   URL.revokeObjectURL(gifUrl);
        // }

        const url = URL.createObjectURL(blob);
        setGifUrl(url);
        setGifUrlHistory((prev) => {
          const newHistory = [...prev, url];
          return newHistory;
        });
        setIsGifProcessing(false);
        clearMask();
      });

      // // Handle rendering progress
      // gif.on("progress", (p: number) => {
      //   console.log(`GIF rendering progress: ${Math.round(p * 100)}%`);
      // });

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
    const intensity = blurSettings.blurIntensity;
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
    const blockSize = Math.max(1, Math.floor(blurSettings.blurIntensity / 2));
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
    const blockSize = Math.max(1, Math.floor(blurSettings.blurIntensity / 2));
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
        // Don't clear the mask here, we want to keep previous masks
        // Just set the composite operation to draw new masks
        maskCtx.globalCompositeOperation = "source-over";
      }
    }

    setIsDrawing(true);
    drawMask(getMousePos(e));

    // Show initial preview
    if (isGifLoaded && originalFrames.length > 0) {
      applyBlurToCurrentFramePreview();
    }
  };

  const stopDrawing = async () => {
    if (isDrawing) {
      setIsDrawing(false);

      try {
        await processAllFrames();
      } catch (error) {
        console.error("Error in stopDrawing:", error);
      }
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    // Draw the mask at the current position
    drawMask(getMousePos(e));

    // Show preview on current frame only
    if (isGifLoaded && originalFrames.length > 0) {
      applyBlurToCurrentFramePreview();
    }
  };

  // Add this new function for preview
  const applyBlurToCurrentFramePreview = () => {
    if (
      !originalFrames.length ||
      currentFrameIndex < 0 ||
      currentFrameIndex >= originalFrames.length
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

    // Create a copy from the original frame for preview
    const frameData = new ImageData(
      new Uint8ClampedArray(originalFrames[currentFrameIndex].data),
      originalFrames[currentFrameIndex].width,
      originalFrames[currentFrameIndex].height
    );

    // Apply blur based on mask
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;

        // If pixel is in the mask (non-transparent)
        if (maskData.data[i + 3] > 0) {
          if (blurSettings.blurType === "pixelated") {
            applyPixelatedBlur(x, y, frameData);
          } else if (blurSettings.blurType === "gaussian") {
            applyGaussianBlur(x, y, frameData);
          } else if (blurSettings.blurType === "mosaic") {
            applyMosaicBlur(x, y, frameData);
          }
        }
      }
    }

    // Display the preview without saving it
    ctx.putImageData(frameData, 0, 0);
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
    maskCtx.arc(pos.x, pos.y, blurSettings.brushSize, 0, Math.PI * 2);
    maskCtx.fill();
  };

  const clearMask = async () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    // Clear the mask canvas
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Restore all frames to original state
    if (isGifLoaded && originalFrames.length > 0) {
      setGifFrames(
        originalFrames.map(
          (frame) =>
            new ImageData(
              new Uint8ClampedArray(frame.data),
              frame.width,
              frame.height
            )
        )
      );

      // Display the current frame
      displayFrame(currentFrameIndex);

      // Reconstruct the GIF with original frames
      await reconstructGif();
    }
  };

  useEffect(() => {
    if (isGifLoaded) {
      displayFrame(0);
    }
  }, [isGifLoaded]);

  useEffect(() => {
    if (activeVideoIndex === null || !videoRefs.current) return;

    const activeVideo = videoRefs.current[activeVideoIndex];
    const clip = videoClips[activeVideoIndex];

    // Add safety checks
    if (!activeVideo || !clip?.file || !clip.duration) return;

    let rafId: number | undefined = undefined;
    let lastUpdateTime = 0;

    const updateTime = () => {
      if (!activeVideo.paused && !activeVideo.ended) {
        // Ensure we have valid clip data
        const currentClip = videoClips[activeVideoIndex];
        if (!currentClip) return;

        // Check if we've reached the end time
        if (activeVideo.currentTime >= currentClip.endTime) {
          activeVideo.currentTime = currentClip.startTime;
        }

        const now = performance.now();
        if (now - lastUpdateTime > 100) {
          setCurrentTime(activeVideo.currentTime);
          lastUpdateTime = now;
        }

        rafId = requestAnimationFrame(updateTime);
      }
    };

    if (isPlaying) {
      // Ensure video is at correct position before playing
      const targetTime = Math.max(
        clip.startTime,
        Math.min(currentTime, clip.endTime)
      );
      if (Math.abs(activeVideo.currentTime - targetTime) > 0.1) {
        activeVideo.currentTime = targetTime;
      }

      activeVideo.play().catch((err) => {
        console.error("Play error:", err);
        setIsPlaying(false);
      });

      updateTime();
    } else {
      activeVideo.pause();
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isPlaying, activeVideoIndex, videoClips, currentTime]);

  // Add this after the gifSettings state
  useEffect(() => {
    // When max duration changes, ensure all clips respect the new limit
    setVideoClips((prev) => {
      return prev.map((clip) => {
        if (!clip.file) return clip;

        const currentDuration = clip.endTime - clip.startTime;
        if (currentDuration <= gifSettings.maxDuration) {
          return clip; // Already within limits
        }

        // Adjust end time to respect new max duration
        return {
          ...clip,
          endTime: Math.min(
            clip.startTime + gifSettings.maxDuration,
            clip.duration
          ),
        };
      });
    });
  }, [gifSettings.maxDuration]);

  useEffect(() => {
    if (activeVideoIndex !== null && videoClips[activeVideoIndex]?.file) {
      const clip = videoClips[activeVideoIndex];
      // Set current time to the clip's start time when switching videos
      setCurrentTime(clip.startTime);

      // Also update the actual video element if it exists
      const activeVideo = videoRefs.current[activeVideoIndex];
      if (activeVideo && activeVideo.readyState >= 2) {
        activeVideo.currentTime = clip.startTime;
      }
    }
  }, [activeVideoIndex]);

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
        <div className="col-span-2">
          <ModelsDropdown formData={formData} setFormData={setFormData} />
        </div>
      </div>

      {/* Template Selection & Video Selector */}
      {formData.model && (
        <>
          <ModelCaptionSelector
            model={formData.model}
            setSelectedCaption={setSelectedCaption}
            selectedCaption={selectedCaption}
            isPaid={isPaid}
            setIsPaid={setIsPaid}
          />
          <div className="bg-gray-800/50 rounded-xl  flex flex-col p-6 mb-4 shadow-lg border border-gray-700/50 backdrop-blur-sm">
            <GifMakerVideoCropper
              templates={templates}
              videoClips={videoClips}
              setSelectedTemplate={setSelectedTemplate}
              setVideoClips={setVideoClips}
              setActiveVideoIndex={setActiveVideoIndex}
              videoRefs={videoRefs}
              selectedTemplate={selectedTemplate}
              outputGridRef={outputGridRef}
              activeVideoIndex={activeVideoIndex}
              setIsPlaying={setIsPlaying}
              handleVideoChange={handleVideoChange}
              totalCells={totalCells}
              setDimensions={(width: number, height: number) =>
                setDimensions({ width, height })
              }
              currentTime={currentTime}
              isPlaying={isPlaying}
              onCurrentTimeChange={handleCurrentTimeChange}
              videoUrls={videoUrls}
              vaultName={vaultName}
            />

            {/* Timeframe Editor */}
            {activeVideoIndex !== null &&
              videoClips[activeVideoIndex]?.file &&
              videoClips[activeVideoIndex]?.duration > 0 && (
                <GifMakerVideoTimeline
                  videoFile={videoClips[activeVideoIndex].file}
                  duration={videoClips[activeVideoIndex].duration}
                  startTime={videoClips[activeVideoIndex].startTime}
                  endTime={videoClips[activeVideoIndex].endTime}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onStartTimeChange={handleStartTimeChange}
                  onEndTimeChange={handleEndTimeChange}
                  onCurrentTimeChange={handleCurrentTimeChange}
                  onPlayPause={handlePlayPause}
                  setMaxDuration={setMaxDuration}
                  maxDuration={gifSettings.maxDuration}
                  setIsGifSettingsOpen={setIsGifSettingsOpen}
                />
              )}
            {/* GIF Settings */}
            {isGifSettingsOpen && (
              <GifMakerGifSettings
                gifSettings={gifSettings}
                setMaxDuration={setMaxDuration}
                setFps={setFps}
                setQuality={setQuality}
              />
            )}

            {/* Generated GIF Preview */}
            {gifUrl && (
              <div className="mb-6">
                <GifMakerEditorSelector
                  gifUrl={gifUrl}
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
                  formData={formData}
                  setWebhookData={setWebhookData}
                  gifUrlHistory={gifUrlHistory}
                  setGifUrlHistory={setGifUrlHistory}
                  setGifUrl={setGifUrl}
                  selectedCaption={selectedCaption}
                  setSelectedCaption={setSelectedCaption}
                />

                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-2">
                  <h3 className="text-gray-300 mb-2 font-medium">
                    Generated GIF
                  </h3>
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
                      <Download className="w-4 h-4 mr-2" />{" "}
                      {isDownloading ? "Downloading..." : "Download GIF"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && error.includes("Check if the path exists") && (
              <p className="text-red-500 text-sm">
                Make sure to scale your video to fit the outline!
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-5">
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
                disabled={
                  isProcessing || videoClips.every((clip) => !clip.file)
                }
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
        </>
      )}
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
