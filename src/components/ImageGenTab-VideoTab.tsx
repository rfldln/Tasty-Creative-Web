"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Video,
  Download,
  Save,
  Play,
  Pause,
  RefreshCw,
  Loader2,
  Plus,
  Trash,
  Eye,
  Upload,
  FolderOpen,
  Check,
  X,
  Star,
  Grid,
  List,
  Search,
  Filter,
  Copy,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Clock,
  Film,
  Zap,
  Settings,
  ImageIcon,
  FileImage,
  Camera,
  WifiOff,
} from "lucide-react";

// Enhanced Video Display Component with Better Error Handling
const EnhancedVideoDisplay: React.FC<{
  video: GeneratedVideo;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  onLoadedData?: () => void;
}> = ({
  video,
  className = "",
  autoPlay = false,
  controls = false,
  muted = true,
  loop = true,
  onLoadedData,
}) => {
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">(
    "loading"
  );
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const maxRetries = 2;

  useEffect(() => {
    setLoadState("loading");
    setErrorDetails("");
    setRetryCount(0);
  }, [video.videoUrl]);

  const handleVideoLoad = () => {
    console.log(`✅ Video loaded successfully: ${video.filename}`);
    setLoadState("loaded");
    onLoadedData?.();
  };

  const handleVideoError = (
    e: React.SyntheticEvent<HTMLVideoElement, Event>
  ) => {
    const videoElement = e.currentTarget;
    const error = videoElement.error;

    let errorMessage = "Unknown video error";
    let errorCode = "UNKNOWN";

    if (error) {
      switch (error.code) {
        case 1: // MEDIA_ERR_ABORTED
          errorMessage = "Video loading was aborted";
          errorCode = "ABORTED";
          break;
        case 2: // MEDIA_ERR_NETWORK
          errorMessage = "Network error occurred while loading video";
          errorCode = "NETWORK";
          break;
        case 3: // MEDIA_ERR_DECODE
          errorMessage = "Video decoding error";
          errorCode = "DECODE";
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorMessage = "Video format not supported or source not found";
          errorCode = "NOT_SUPPORTED";
          break;
        default:
          errorMessage = `Video error: ${error.message || "Unknown"}`;
          errorCode = `CODE_${error.code}`;
      }
    }

    console.error(`❌ Video error for ${video.filename}:`, {
      errorCode,
      errorMessage,
      videoUrl: video.videoUrl,
      networkState: videoElement.networkState,
      readyState: videoElement.readyState,
      currentSrc: videoElement.currentSrc,
    });

    setErrorDetails(`${errorCode}: ${errorMessage}`);

    // Auto-retry logic for network errors
    if (
      retryCount < maxRetries &&
      (errorCode === "NETWORK" || errorCode === "ABORTED")
    ) {
      console.log(
        `🔄 Retrying video load (${retryCount + 1}/${maxRetries})...`
      );
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setLoadState("loading");
        if (videoRef.current) {
          videoRef.current.load(); // Reload the video
        }
      }, 1000 * (retryCount + 1)); // Exponential backoff
    } else {
      setLoadState("error");
    }
  };

  const handleManualRetry = () => {
    setLoadState("loading");
    setErrorDetails("");
    setRetryCount(0);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  const handleOpenInNewTab = () => {
    window.open(video.videoUrl, "_blank", "noopener,noreferrer");
  };

  // For WebP files, use the existing WebPDisplay component
  if (video.filename.toLowerCase().endsWith(".webp")) {
    return (
      <WebPDisplay
        src={video.videoUrl}
        filename={video.filename}
        className={className}
        alt="Generated animation"
      />
    );
  }

  if (loadState === "error") {
    return (
      <div
        className={`${className} bg-gray-800/50 flex flex-col items-center justify-center text-gray-400 p-4`}
      >
        <div className="text-center">
          <X className="w-8 h-8 mb-2 text-red-400 mx-auto" />
          <p className="text-xs font-medium mb-1">Video Load Failed</p>
          <p className="text-xs opacity-60 mb-3 max-w-xs">{errorDetails}</p>

          <div className="space-y-2">
            <button
              onClick={handleManualRetry}
              className="block text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-1 rounded transition-colors w-full"
            >
              🔄 Retry Loading
            </button>

            <button
              onClick={handleOpenInNewTab}
              className="block text-xs bg-green-600/20 hover:bg-green-600/30 text-green-300 px-3 py-1 rounded transition-colors w-full"
            >
              🌐 Open in New Tab
            </button>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            <p>File: {video.filename}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loadState === "loading" && (
        <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400">
              Loading video...
              {retryCount > 0 && ` (Retry ${retryCount}/${maxRetries})`}
            </p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={video.videoUrl}
        className="w-full h-full object-cover"
        autoPlay={autoPlay}
        controls={controls}
        muted={muted}
        loop={loop}
        onLoadedData={handleVideoLoad}
        onError={handleVideoError}
        onLoadStart={() => setLoadState("loading")}
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
      />

      {loadState === "loaded" && (
        <div className="absolute top-2 right-2 bg-green-600/80 text-white text-xs px-2 py-1 rounded">
          ✓ Video
        </div>
      )}
    </div>
  );
};

// Direct WebP display component with fallbacks
const WebPDisplay: React.FC<{
  src: string;
  filename: string;
  className?: string;
  alt?: string;
}> = ({ src, filename, className = "", alt = "Generated animation" }) => {
  const [loadState, setLoadState] = useState<
    "loading" | "loaded" | "error" | "cors-proxy"
  >("loading");
  const [actualSrc, setActualSrc] = useState(src);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    setLoadState("loading");
    setActualSrc(src);
    setError("");
  }, [src]);

  const handleImageLoad = () => {
    console.log(`✅ WebP loaded successfully: ${actualSrc}`);
    setLoadState("loaded");
  };

  const handleImageError = (e: any) => {
    console.log(`❌ WebP failed to load: ${actualSrc}`);
    console.log("Error details:", e);

    // Try with different URL variations
    if (loadState === "loading") {
      // Try adding explicit parameters
      const corsProxyUrl = `${src}${
        src.includes("?") ? "&" : "?"
      }cache=${Date.now()}`;
      console.log(`🔄 Trying with cache buster: ${corsProxyUrl}`);
      setActualSrc(corsProxyUrl);
      setLoadState("cors-proxy");
    } else {
      setError("Failed to load WebP file");
      setLoadState("error");
    }
  };

  if (loadState === "loading") {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-800/50`}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-2" />
          <p className="text-xs text-gray-400">Loading animation...</p>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center bg-gray-800/50 text-gray-400 p-4`}
      >
        <X className="w-8 h-8 mb-2 text-red-400" />
        <p className="text-xs text-center font-medium">WebP Load Failed</p>
        <p className="text-xs text-center opacity-60 mb-3">{error}</p>

        {/* Direct test buttons */}
        <div className="space-y-2">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-1 rounded transition-colors"
          >
            Open Original URL
          </a>

          <button
            onClick={() => {
              // Try to fetch and convert to blob URL
              fetch(src, { mode: "cors" })
                .then((response) => response.blob())
                .then((blob) => {
                  const blobUrl = URL.createObjectURL(blob);
                  setActualSrc(blobUrl);
                  setLoadState("loading");
                })
                .catch((err) => {
                  console.error("Blob conversion failed:", err);
                  setError(`Fetch failed: ${err.message}`);
                });
            }}
            className="block text-xs bg-green-600/20 hover:bg-green-600/30 text-green-300 px-3 py-1 rounded transition-colors"
          >
            Try Blob Conversion
          </button>
        </div>
      </div>
    );
  }

  // Render the actual image
  return (
    <>
      <img
        src={actualSrc}
        alt={alt}
        className={className}
        onLoad={handleImageLoad}
        onError={handleImageError}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        style={{
          imageRendering: "auto",
          objectFit: "cover",
        }}
      />

      {/* Debug overlay for loaded state */}
      {loadState === "loaded" && (
        <div className="absolute top-2 right-2 bg-green-600/80 text-white text-xs px-2 py-1 rounded">
          ✓ WebP
        </div>
      )}

      {loadState === "cors-proxy" && (
        <div className="absolute top-2 right-2 bg-yellow-600/80 text-white text-xs px-2 py-1 rounded">
          📡 Retry
        </div>
      )}
    </>
  );
};

// TypeScript interfaces for video generation
interface GeneratedVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  filename: string;
  prompt: string;
  negativePrompt?: string;
  settings: VideoGenerationSettings;
  timestamp: Date;
  isBookmarked?: boolean;
  isInVault?: boolean;
  blobUrl?: string;
  duration: number; // in seconds
  fileSize?: number; // in bytes
  status: "generating" | "completed" | "failed";
  progress?: number;
  sourceImage?: string; // For image-to-video
}

interface VideoGenerationSettings {
  model: string;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  motionStrength: number;
  seed?: number;
  guidanceScale: number;
  steps: number;
  sampler: string;
  scheduler: string;
}

// UPDATED WAN Video Generation Hook - Replace in ImageGenTab-VideoTab.tsx
const useWanVideoGeneration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState("");

  useEffect(() => {
    // Test connection to ComfyUI via our API route
    const testConnection = async () => {
      try {
        const response = await fetch("/api/comfyui/object-info", {
          method: "GET",
        });

        if (response.ok) {
          setIsConnected(true);

          // Set available WAN models
          setAvailableModels([
            "wan2.1_i2v_720p_14B_fp16.safetensors",
            "wan2.1_i2v_1080p_14B_fp16.safetensors",
          ]);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error("Connection test failed:", error);
        setIsConnected(false);
        // For development, set mock data
        setAvailableModels([
          "wan2.1_i2v_720p_14B_fp16.safetensors",
          "wan2.1_i2v_1080p_14B_fp16.safetensors",
        ]);
      }
    };

    testConnection();
  }, []);

  // Update this function in your useWanVideoGeneration hook
  const uploadImage = async (imageFile: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("type", "input");
    formData.append("subfolder", "");

    const response = await fetch("/api/comfyui/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to upload image: ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    return result.name; // Return the uploaded filename
  };

  const handleGenerate = async (params: any): Promise<GeneratedVideo[]> => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentStage("Uploading source image...");

    try {
      // First, upload the image file to ComfyUI
      let uploadedImageName = params.sourceImage;
      if (params.imageFile) {
        setCurrentStage("Uploading image to ComfyUI...");
        uploadedImageName = await uploadImage(params.imageFile);
        setGenerationProgress(10);
      }

      setCurrentStage("Building WAN 2.1 workflow...");
      setGenerationProgress(15);

      // Build the corrected WAN 2.1 workflow
      const workflow = {
        "37": {
          class_type: "UNETLoader",
          inputs: {
            unet_name: params.model,
            weight_dtype: "default",
          },
        },
        "38": {
          class_type: "CLIPLoader",
          inputs: {
            clip_name: "umt5_xxl_fp16.safetensors",
            type: "wan",
          },
        },
        "39": {
          class_type: "VAELoader",
          inputs: {
            vae_name: "wan_2.1_vae.safetensors",
          },
        },
        "49": {
          class_type: "CLIPVisionLoader",
          inputs: {
            clip_name: "clip_vision_h.safetensors",
          },
        },
        "52": {
          class_type: "LoadImage",
          inputs: {
            image: uploadedImageName,
          },
        },
        "51": {
          class_type: "CLIPVisionEncode",
          inputs: {
            clip_vision: ["49", 0],
            image: ["52", 0],
            crop: "none",
          },
        },
        "6": {
          class_type: "CLIPTextEncode",
          inputs: {
            clip: ["38", 0],
            text: params.prompt,
          },
        },
        "7": {
          class_type: "CLIPTextEncode",
          inputs: {
            clip: ["38", 0],
            text:
              params.negativePrompt ||
              "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走",
          },
        },
        "54": {
          class_type: "ModelSamplingSD3",
          inputs: {
            model: ["37", 0],
            shift: 8,
          },
        },
        "50": {
          class_type: "WanImageToVideo",
          inputs: {
            positive: ["6", 0],
            negative: ["7", 0],
            vae: ["39", 0],
            clip_vision_output: ["51", 0],
            start_image: ["52", 0],
            width: params.width,
            height: params.height,
            num_frames: params.frameCount,
            motion_bucket_id: params.motionStrength,
            length: params.frameCount,
            batch_size: 1,
          },
        },
        "3": {
          class_type: "KSampler",
          inputs: {
            model: ["54", 0],
            positive: ["50", 0],
            negative: ["50", 1],
            latent_image: ["50", 2],
            seed: params.seed || Math.floor(Math.random() * 1000000000),
            steps: params.steps,
            cfg: params.guidanceScale,
            sampler_name: params.sampler,
            scheduler: params.scheduler,
            denoise: 1.0,
          },
        },
        "8": {
          class_type: "VAEDecode",
          inputs: {
            samples: ["3", 0],
            vae: ["39", 0],
          },
        },
        "47": {
          class_type: "VHS_VideoCombine",
          inputs: {
            images: ["8", 0],
            frame_rate: params.fps,
            loop_count: 0,
            filename_prefix: "WAN_Video",
            format: "video/h264-mp4",
            pix_fmt: "yuv420p",
            crf: 19,
            save_metadata: true,
            pingpong: false,
            save_output: true,
          },
        },
      };

      // Queue the prompt to ComfyUI via API route
      const clientId =
        Math.random().toString(36).substring(2) + Date.now().toString(36);

      setCurrentStage("Queuing generation...");
      setGenerationProgress(20);

      console.log("Sending WAN workflow:", JSON.stringify(workflow, null, 2));

      const queueResponse = await fetch("/api/comfyui/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: workflow,
          client_id: clientId,
        }),
      });

      if (!queueResponse.ok) {
        const errorText = await queueResponse.text();
        console.error("Queue response error:", errorText);
        throw new Error(
          `Failed to queue prompt: ${queueResponse.statusText} - ${errorText}`
        );
      }

      const queueResult = await queueResponse.json();
      console.log("Queue result:", queueResult);
      const promptId = queueResult.prompt_id;

      // Poll for completion - longer timeout for video generation
      let attempts = 0;
      const timeoutMinutes = 60; // 60 minutes for video generation
      const maxAttempts = timeoutMinutes * 60; // Convert to seconds

      console.log(
        `Setting timeout to ${timeoutMinutes} minutes for video generation`
      );

      while (attempts < maxAttempts) {
        setCurrentStage(
          `Processing animation... (${Math.floor(attempts / 60)}:${(
            attempts % 60
          )
            .toString()
            .padStart(2, "0")} / ${timeoutMinutes}:00)`
        );
        setGenerationProgress(20 + Math.min((attempts / maxAttempts) * 70, 70));

        try {
          const historyResponse = await fetch(
            `/api/comfyui/history/${promptId}`,
            {
              method: "GET",
            }
          );

          if (historyResponse.ok) {
            const history = await historyResponse.json();

            if (history[promptId]) {
              const execution = history[promptId];

              if (execution.status && execution.status.completed) {
                setCurrentStage("Retrieving animation...");
                setGenerationProgress(95);

                // Get the generated videos/animated images
                const videoUrls: string[] = [];
                const fileDetails: any[] = [];

                console.log("=== FULL EXECUTION OUTPUT ===");
                console.log(JSON.stringify(execution.outputs, null, 2));

                if (execution.outputs) {
                  for (const nodeId in execution.outputs) {
                    const nodeOutput = execution.outputs[nodeId];
                    console.log(`=== Node ${nodeId} Output ===`);
                    console.log(JSON.stringify(nodeOutput, null, 2));

                    // Check ALL possible output formats
                    const outputKeys = Object.keys(nodeOutput);
                    console.log(
                      `Available output keys for node ${nodeId}:`,
                      outputKeys
                    );

                    // Check for animated WebP files from SaveAnimatedWEBP node
                    if (nodeOutput.images) {
                      console.log("Found 'images' output:", nodeOutput.images);
                      for (const image of nodeOutput.images) {
                        const videoUrl = `/api/comfyui/view?filename=${
                          image.filename
                        }&subfolder=${image.subfolder || ""}&type=${
                          image.type || "output"
                        }`;
                        videoUrls.push(videoUrl);
                        fileDetails.push({
                          ...image,
                          url: videoUrl,
                          source: "images",
                        });
                        console.log("Added image URL:", videoUrl);
                      }
                    }

                    // Check for videos in case using SaveWEBM
                    if (nodeOutput.videos) {
                      console.log("Found 'videos' output:", nodeOutput.videos);
                      for (const video of nodeOutput.videos) {
                        const videoUrl = `/api/comfyui/view?filename=${
                          video.filename
                        }&subfolder=${video.subfolder || ""}&type=${
                          video.type || "output"
                        }`;
                        videoUrls.push(videoUrl);
                        fileDetails.push({
                          ...video,
                          url: videoUrl,
                          source: "videos",
                        });
                        console.log("Added video URL:", videoUrl);
                      }
                    }

                    // Check for webm files in different output format
                    if (nodeOutput.webm) {
                      console.log("Found 'webm' output:", nodeOutput.webm);
                      for (const video of nodeOutput.webm) {
                        const videoUrl = `/api/comfyui/view?filename=${
                          video.filename
                        }&subfolder=${video.subfolder || ""}&type=${
                          video.type || "output"
                        }`;
                        videoUrls.push(videoUrl);
                        fileDetails.push({
                          ...video,
                          url: videoUrl,
                          source: "webm",
                        });
                        console.log("Added webm URL:", videoUrl);
                      }
                    }

                    // Check for generic files
                    if (nodeOutput.files) {
                      console.log("Found 'files' output:", nodeOutput.files);
                      for (const file of nodeOutput.files) {
                        const videoUrl = `/api/comfyui/view?filename=${
                          file.filename
                        }&subfolder=${file.subfolder || ""}&type=${
                          file.type || "output"
                        }`;
                        videoUrls.push(videoUrl);
                        fileDetails.push({
                          ...file,
                          url: videoUrl,
                          source: "files",
                        });
                        console.log("Added file URL:", videoUrl);
                      }
                    }

                    // Check for ANY other output that might contain files
                    for (const key of outputKeys) {
                      if (
                        !["images", "videos", "webm", "files"].includes(key) &&
                        Array.isArray(nodeOutput[key])
                      ) {
                        console.log(
                          `Found unknown output array '${key}':`,
                          nodeOutput[key]
                        );
                        for (const item of nodeOutput[key]) {
                          if (
                            item &&
                            typeof item === "object" &&
                            item.filename
                          ) {
                            const videoUrl = `/api/comfyui/view?filename=${
                              item.filename
                            }&subfolder=${item.subfolder || ""}&type=${
                              item.type || "output"
                            }`;
                            videoUrls.push(videoUrl);
                            fileDetails.push({
                              ...item,
                              url: videoUrl,
                              source: key,
                            });
                            console.log(`Added ${key} URL:`, videoUrl);
                          }
                        }
                      }
                    }
                  }
                }

                console.log("=== FINAL RESULTS ===");
                console.log("All found URLs:", videoUrls);
                console.log("File details:", fileDetails);

                if (videoUrls.length === 0) {
                  console.error("No files found in any output format!");
                  throw new Error(
                    "No animation/video files found in generation output. Check console for details."
                  );
                }

                setGenerationProgress(100);

                // Calculate duration based on frame count and FPS
                const duration = params.frameCount / params.fps;

                // Convert to GeneratedVideo objects
                const generatedVideos = videoUrls.map((url, index) => ({
                  id: `${promptId}_${index}`,
                  videoUrl: url,
                  filename: `wan_video_${promptId}_${index}.mp4`,
                  prompt: params.prompt,
                  negativePrompt: params.negativePrompt,
                  sourceImage: uploadedImageName,
                  settings: {
                    model: params.model,
                    width: params.width,
                    height: params.height,
                    fps: params.fps,
                    frameCount: params.frameCount,
                    motionStrength: params.motionStrength,
                    seed: params.seed,
                    guidanceScale: params.guidanceScale,
                    steps: params.steps,
                    sampler: params.sampler,
                    scheduler: params.scheduler,
                  },
                  timestamp: new Date(),
                  duration: duration,
                  status: "completed" as const,
                }));

                return generatedVideos;
              }

              if (execution.status && execution.status.status_str === "error") {
                throw new Error("Animation generation failed with error");
              }
            }
          }
        } catch (error) {
          console.warn("Status check failed:", error);
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      throw new Error("Animation generation timed out");
    } catch (error) {
      console.error("Animation generation error:", error);
      throw error;
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setCurrentStage("");
    }
  };

  return {
    handleGenerate,
    availableModels,
    isConnected,
    isGenerating,
    generationProgress,
    currentStage,
  };
};

interface VideoTabProps {
  generatedVideos: GeneratedVideo[];
  setGeneratedVideos: React.Dispatch<React.SetStateAction<GeneratedVideo[]>>;
}

const VideoTab: React.FC<VideoTabProps> = ({
  generatedVideos,
  setGeneratedVideos,
}) => {
  // WAN video generation hook
  const {
    handleGenerate: generateVideo,
    availableModels,
    isConnected,
    isGenerating: videoGenerating,
    generationProgress: videoProgress,
    currentStage,
  } = useWanVideoGeneration();

  // Generation states
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(
    "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走"
  );
  const [selectedModel, setSelectedModel] = useState(
    "wan2.1_i2v_720p_14B_fp16.safetensors"
  );
  const [width, setWidth] = useState(832);
  const [height, setHeight] = useState(1216);
  const [fps, setFps] = useState(16);
  const [frameCount, setFrameCount] = useState(65);
  const [motionStrength, setMotionStrength] = useState(1);
  const [guidanceScale, setGuidanceScale] = useState(6);
  const [steps, setSteps] = useState(20);
  const [sampler, setSampler] = useState("uni_pc");
  const [scheduler, setScheduler] = useState("simple");
  const [seed, setSeed] = useState("");

  // Image upload states
  const [sourceImage, setSourceImage] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  // UI states
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video generation presets
  const presetSizes = [
    { name: "HD Portrait", width: 832, height: 1216 },
    { name: "HD Landscape", width: 1216, height: 832 },
    { name: "Square", width: 1024, height: 1024 },
    { name: "720p", width: 1280, height: 720 },
    { name: "1080p", width: 1920, height: 1080 },
  ];

  const frameCountPresets = [25, 49, 65, 81, 97];
  const fpsPresets = [8, 12, 16, 24, 30];
  const samplerOptions = [
    "uni_pc",
    "euler",
    "euler_ancestral",
    "dpm_2m",
    "dpm_2m_karras",
  ];
  const schedulerOptions = ["simple", "normal", "karras", "exponential"];

  // Image upload handlers
  const handleImageUpload = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // For the actual workflow, you'd upload this to your server or ComfyUI
      // For now, we'll use the preview URL as the source
      setSourceImage(file.name);

      setError("");
    } else {
      setError("Please select a valid image file (PNG, JPG, JPEG, WEBP)");
    }
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    setSourceImage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Main generation function
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    if (!imageFile) {
      setError(
        "Please upload a source image for image-to-animation generation"
      );
      return;
    }

    if (!isConnected) {
      setError("Not connected to ComfyUI. Please check your connection.");
      return;
    }

    setError("");

    try {
      const generationParams = {
        prompt,
        negativePrompt,
        model: selectedModel,
        width,
        height,
        fps,
        frameCount,
        motionStrength,
        guidanceScale,
        steps,
        sampler,
        scheduler,
        seed: seed ? parseInt(seed) : undefined,
        sourceImage,
        imageFile, // Pass the actual file for upload
      };

      const newVideos = await generateVideo(generationParams);
      setGeneratedVideos((prev) => [...newVideos, ...prev]);
    } catch (error) {
      console.error("Animation generation failed:", error);
      setError(
        `Generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // FIXED Video download function
  const downloadVideo = async (video: GeneratedVideo) => {
    try {
      console.log(`Attempting to download: ${video.videoUrl}`);

      // Method 1: Try to fetch the video as blob first
      const response = await fetch(video.videoUrl, {
        method: "GET",
        mode: "cors",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Create and trigger download
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = video.filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);

      console.log(`✅ Successfully downloaded: ${video.filename}`);
    } catch (error) {
      console.error("Download failed:", error);

      // Method 2: Fallback - try direct download link
      try {
        const link = document.createElement("a");
        link.href = video.videoUrl;
        link.download = video.filename;
        link.style.display = "none";
        link.setAttribute("target", "_blank");

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`⚠️ Used fallback download for: ${video.filename}`);
      } catch (fallbackError) {
        console.error("Fallback download also failed:", fallbackError);

        // Method 3: Last resort - open in new tab with download headers
        const downloadUrl = `${video.videoUrl}${
          video.videoUrl.includes("?") ? "&" : "?"
        }download=1`;
        window.open(downloadUrl, "_blank");

        console.log(`⚠️ Opened in new tab: ${video.filename}`);
      }
    }
  };

  // Video utility functions
  const formatFileSize = (bytes: number): string => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleBookmark = (videoId: string) => {
    setGeneratedVideos((prev) =>
      prev.map((vid) =>
        vid.id === videoId ? { ...vid, isBookmarked: !vid.isBookmarked } : vid
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Generation Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Generation Controls */}
        <Card className="lg:col-span-2 bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Video className="mr-2" />
              WAN 2.1 Image-to-Animation Generation
            </CardTitle>
            <CardDescription className="text-gray-400">
              Transform images into dynamic animations using WAN 2.1 AI model
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Image Upload Section */}
            <div className="space-y-4">
              <Label className="text-gray-300 text-base font-medium">
                Source Image
              </Label>

              {/* Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer hover:border-purple-400/50 ${
                  dragActive
                    ? "border-purple-400 bg-purple-400/10"
                    : imagePreview
                    ? "border-green-400/50 bg-green-400/5"
                    : "border-white/20 bg-black/40"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Source image preview"
                      className="max-w-full max-h-64 mx-auto rounded-lg object-contain"
                    />
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-red-600/80 border-red-500 text-white hover:bg-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearImage();
                        }}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-green-400 text-sm font-medium">
                        ✓ Image loaded: {imageFile?.name}
                      </p>
                      <p className="text-gray-400 text-xs">
                        Click to change image
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-4">
                        <Camera size={32} className="text-purple-400" />
                      </div>
                      <h3 className="text-white text-lg font-medium mb-2">
                        Upload Source Image
                      </h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Drag and drop an image here, or click to browse
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Supports: PNG, JPG, JPEG, WEBP</span>
                        <span>•</span>
                        <span>Max size: 10MB</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Section */}
            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="video-prompt"
                  className="text-gray-300 mb-2 block"
                >
                  Motion Prompt
                </Label>
                <Textarea
                  id="video-prompt"
                  placeholder="Describe the motion or animation you want to see..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-lg min-h-24"
                  rows={3}
                />
                <p className="text-gray-500 text-xs mt-1">
                  Example: "The woman is swaying her hips from side to side"
                </p>
              </div>

              <div>
                <Label
                  htmlFor="video-negative-prompt"
                  className="text-gray-300 mb-2 block"
                >
                  Negative Prompt
                </Label>
                <Textarea
                  id="video-negative-prompt"
                  placeholder="What to avoid in the video..."
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-lg min-h-20"
                  rows={2}
                />
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <Label className="text-gray-300 mb-2 block">WAN Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="bg-black/60 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10 text-white">
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model.includes("720p")
                        ? "WAN 2.1 - 720p (14B)"
                        : "WAN 2.1 - 1080p (14B)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Size Presets */}
            <div>
              <Label className="text-gray-300 mb-2 block">
                Resolution Presets
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {presetSizes.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    className={`bg-black/60 border-white/10 text-white hover:bg-white/10 ${
                      width === preset.width && height === preset.height
                        ? "bg-purple-600/30 border-purple-400"
                        : ""
                    }`}
                    onClick={() => {
                      setWidth(preset.width);
                      setHeight(preset.height);
                    }}
                  >
                    {preset.name}
                    <br />
                    <span className="text-xs opacity-60">
                      {preset.width}×{preset.height}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Video Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 mb-2 block">
                  Frame Count: {frameCount}
                </Label>
                <div className="flex space-x-2 mb-2">
                  {frameCountPresets.map((count) => (
                    <Button
                      key={count}
                      variant="outline"
                      size="sm"
                      className={`text-xs ${
                        frameCount === count
                          ? "bg-purple-600/30 border-purple-400"
                          : "bg-black/60 border-white/10"
                      } text-white hover:bg-white/10`}
                      onClick={() => setFrameCount(count)}
                    >
                      {count}f
                    </Button>
                  ))}
                </div>
                <Slider
                  value={[frameCount]}
                  min={25}
                  max={97}
                  step={8}
                  onValueChange={(value) => setFrameCount(value[0])}
                  className="py-2"
                />
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">FPS: {fps}</Label>
                <div className="flex space-x-2 mb-2">
                  {fpsPresets.map((f) => (
                    <Button
                      key={f}
                      variant="outline"
                      size="sm"
                      className={`text-xs ${
                        fps === f
                          ? "bg-purple-600/30 border-purple-400"
                          : "bg-black/60 border-white/10"
                      } text-white hover:bg-white/10`}
                      onClick={() => setFps(f)}
                    >
                      {f}
                    </Button>
                  ))}
                </div>
                <Slider
                  value={[fps]}
                  min={8}
                  max={30}
                  step={1}
                  onValueChange={(value) => setFps(value[0])}
                  className="py-2"
                />
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">
                    Motion Strength: {motionStrength}
                  </Label>
                  <Slider
                    value={[motionStrength]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(value) => setMotionStrength(value[0])}
                    className="py-2"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">
                    Guidance Scale: {guidanceScale}
                  </Label>
                  <Slider
                    value={[guidanceScale]}
                    min={1}
                    max={20}
                    step={0.5}
                    onValueChange={(value) => setGuidanceScale(value[0])}
                    className="py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">
                    Steps: {steps}
                  </Label>
                  <Slider
                    value={[steps]}
                    min={10}
                    max={50}
                    step={1}
                    onValueChange={(value) => setSteps(value[0])}
                    className="py-2"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Sampler</Label>
                  <Select value={sampler} onValueChange={setSampler}>
                    <SelectTrigger className="bg-black/60 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/10 text-white">
                      {samplerOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Scheduler</Label>
                  <Select value={scheduler} onValueChange={setScheduler}>
                    <SelectTrigger className="bg-black/60 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/10 text-white">
                      {schedulerOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Seed</Label>
                  <div className="flex space-x-1">
                    <Input
                      placeholder="Random"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      className="bg-black/60 border-white/10 text-white flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-black/60 border-white/10 text-white hover:bg-white/10"
                      onClick={() =>
                        setSeed(Math.floor(Math.random() * 1000000).toString())
                      }
                    >
                      <RefreshCw size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Status Alert */}
            {!isConnected && (
              <Alert className="bg-red-900/20 border-red-500/30 text-red-200">
                <WifiOff className="h-4 w-4" />
                <AlertTitle>Connection Issue</AlertTitle>
                <AlertDescription>
                  Cannot connect to ComfyUI for animation generation. Please
                  check your instance is running and accessible.
                </AlertDescription>
              </Alert>
            )}

            {/* Error Display */}
            {error && (
              <Alert
                variant="destructive"
                className="bg-red-900/20 border-red-500/30 text-red-200"
              >
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter>
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg"
              onClick={handleGenerate}
              disabled={
                videoGenerating || !prompt.trim() || !imageFile || !isConnected
              }
            >
              {videoGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Animation... {videoProgress}%
                  {currentStage && (
                    <span className="ml-1">({currentStage})</span>
                  )}
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Generate Animation ({Math.round((frameCount / fps) * 10) / 10}
                  s)
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Right Panel - Latest Generation Preview */}
        <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
          <CardHeader>
            <CardTitle className="text-white">Latest Generation</CardTitle>
            <CardDescription className="text-gray-400">
              Preview your most recent animation
            </CardDescription>
          </CardHeader>

          <CardContent>
            {videoGenerating ? (
              <div className="aspect-video bg-black/50 rounded-lg border border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-400" />
                  <p className="text-gray-300">Generating animation...</p>
                  <p className="text-sm text-gray-400">{videoProgress}%</p>
                  {currentStage && (
                    <p className="text-xs text-gray-500 mt-1">{currentStage}</p>
                  )}
                  <div className="mt-3 bg-gray-700 rounded-full h-2 w-full">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${videoProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : generatedVideos.length > 0 ? (
              <div className="space-y-4">
                <div className="aspect-video bg-black/50 rounded-lg border border-white/10 overflow-hidden relative group">
                  <EnhancedVideoDisplay
                    video={generatedVideos[0]}
                    className="w-full h-full object-cover"
                    autoPlay={true}
                    muted={true}
                    loop={true}
                    onLoadedData={() =>
                      console.log(
                        `Preview video loaded: ${generatedVideos[0].videoUrl}`
                      )
                    }
                  />

                  {/* Debug Info */}
                  <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {generatedVideos[0].filename}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {generatedVideos[0].prompt}
                  </p>

                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{formatDuration(generatedVideos[0].duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Resolution:</span>
                      <span>
                        {generatedVideos[0].settings.width}×
                        {generatedVideos[0].settings.height}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frames:</span>
                      <span>
                        {generatedVideos[0].settings.frameCount} @{" "}
                        {generatedVideos[0].settings.fps}fps
                      </span>
                    </div>
                    {generatedVideos[0].sourceImage && (
                      <div className="flex justify-between">
                        <span>Source:</span>
                        <span className="truncate ml-2">
                          {generatedVideos[0].sourceImage}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/5 border-white/10 hover:bg-white/10"
                      onClick={() => downloadVideo(generatedVideos[0])}
                    >
                      <Download size={14} className="mr-1" />
                      Download
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/5 border-white/10 hover:bg-white/10"
                      onClick={() => toggleBookmark(generatedVideos[0].id)}
                    >
                      <Star
                        size={14}
                        className={`mr-1 ${
                          generatedVideos[0].isBookmarked
                            ? "fill-yellow-400 text-yellow-400"
                            : ""
                        }`}
                      />
                      Bookmark
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-gray-900/50 border-gray-500/30 hover:bg-gray-800/50"
                      onClick={() =>
                        window.open(generatedVideos[0].videoUrl, "_blank")
                      }
                    >
                      <Eye size={14} className="mr-1" />
                      Test URL
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-black/50 rounded-lg border border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-12 h-12 mx-auto mb-4 text-gray-500 opacity-50" />
                  <p className="text-gray-300">No animations generated yet</p>
                  <p className="text-sm text-gray-400">
                    {isConnected
                      ? "Upload an image and create your first animation"
                      : "Connect to ComfyUI to start generating"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VideoTab;
