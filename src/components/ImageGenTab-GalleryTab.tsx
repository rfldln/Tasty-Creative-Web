"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Search,
  Filter,
  Grid,
  List,
  Download,
  Trash,
  Eye,
  Check,
  X,
  Star,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Maximize,
  Image,
  Video,
  FileImage,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Wand2,
} from "lucide-react";

// Types
interface GeneratedImage {
  id: string;
  imageUrl: string;
  filename: string;
  prompt: string;
  negativePrompt?: string;
  settings: any;
  timestamp: Date;
  isBookmarked?: boolean;
  isInVault?: boolean;
  blobUrl?: string;
  type: "image";
}

interface GeneratedVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  filename: string;
  prompt: string;
  negativePrompt?: string;
  settings: any;
  timestamp: Date;
  isBookmarked?: boolean;
  isInVault?: boolean;
  blobUrl?: string;
  duration: number;
  fileSize?: number;
  status: "generating" | "completed" | "failed";
  progress?: number;
  sourceImage?: string;
  type: "video";
}

type MediaItem = GeneratedImage | GeneratedVideo;

interface CombinedGalleryProps {
  generatedImages: GeneratedImage[];
  setGeneratedImages: React.Dispatch<React.SetStateAction<GeneratedImage[]>>;
  generatedVideos: GeneratedVideo[];
  setGeneratedVideos: React.Dispatch<React.SetStateAction<GeneratedVideo[]>>;
  onSendToPromptGenerator?: (items: MediaItem[]) => void;
  onAddToVault?: (items: MediaItem[]) => void;
}

// Enhanced Video Display Component with hover controls
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
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const videoRef = useRef<HTMLVideoElement>(null);

  const maxRetries = 2;

  useEffect(() => {
    setLoadState("loading");
    setErrorDetails("");
    setRetryCount(0);
  }, [video.videoUrl]);

  const handleVideoLoad = () => {
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
        case 1:
          errorMessage = "Video loading was aborted";
          errorCode = "ABORTED";
          break;
        case 2:
          errorMessage = "Network error occurred while loading video";
          errorCode = "NETWORK";
          break;
        case 3:
          errorMessage = "Video decoding error";
          errorCode = "DECODE";
          break;
        case 4:
          errorMessage = "Video format not supported or source not found";
          errorCode = "NOT_SUPPORTED";
          break;
        default:
          errorMessage = `Video error: ${error.message || "Unknown"}`;
          errorCode = `CODE_${error.code}`;
      }
    }

    setErrorDetails(`${errorCode}: ${errorMessage}`);

    if (
      retryCount < maxRetries &&
      (errorCode === "NETWORK" || errorCode === "ABORTED")
    ) {
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setLoadState("loading");
        if (videoRef.current) {
          videoRef.current.load();
        }
      }, 1000 * (retryCount + 1));
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

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // For WebP files, display as image
  if (video.filename.toLowerCase().endsWith(".webp")) {
    return (
      <img
        src={video.videoUrl}
        alt={video.filename}
        className={className}
        onLoad={handleVideoLoad}
        onError={() => setLoadState("error")}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        style={{ imageRendering: "auto", objectFit: "cover" }}
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
          <button
            onClick={handleManualRetry}
            className="block text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-1 rounded transition-colors w-full"
          >
            🔄 Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className} group`}>
      {loadState === "loading" && (
        <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Loading video...</p>
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
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Hover Play/Pause Control for gallery */}
      {!controls && loadState === "loaded" && (
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/20"
          onClick={togglePlayPause}
        >
          <div className="bg-black/60 rounded-full p-2">
            {isPlaying ? (
              <Pause size={20} className="text-white" />
            ) : (
              <Play size={20} className="text-white" />
            )}
          </div>
        </div>
      )}

      {loadState === "loaded" && (
        <div className="absolute top-2 right-2 bg-green-600/80 text-white text-xs px-2 py-1 rounded">
          ✓ Video
        </div>
      )}
    </div>
  );
};

// Enhanced Image Component
const ComfyUIImage: React.FC<{
  image: GeneratedImage;
  className?: string;
  alt: string;
}> = ({ image, className, alt }) => {
  const [imgSrc, setImgSrc] = useState<string>(image.blobUrl || image.imageUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(image.blobUrl || image.imageUrl);
    setIsLoading(true);
    setHasError(false);
  }, [image.blobUrl, image.imageUrl]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = async () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div
        className={`${className} bg-gray-800 flex items-center justify-center`}
      >
        <div className="text-center text-gray-400">
          <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Failed to load</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        className="w-full h-full object-contain bg-black/20"
        onLoad={handleImageLoad}
        onError={handleImageError}
        crossOrigin="anonymous"
      />
    </div>
  );
};

const CombinedGallery: React.FC<CombinedGalleryProps> = ({
  generatedImages,
  setGeneratedImages,
  generatedVideos,
  setGeneratedVideos,
  onSendToPromptGenerator,
  onAddToVault,
}) => {
  // UI states
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedContentType, setSelectedContentType] = useState("all");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"date" | "name" | "type">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal states
  const [selectedItemForModal, setSelectedItemForModal] =
    useState<MediaItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Video player states for modal
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Add type property to items and combine
  const allMediaItems: MediaItem[] = [
    ...generatedImages.map((img) => ({ ...img, type: "image" as const })),
    ...generatedVideos.map((vid) => ({ ...vid, type: "video" as const })),
  ];

  // Categories
  const categories = [
    "all",
    "portraits",
    "landscapes",
    "objects",
    "anime",
    "realistic",
    "abstract",
    "concept-art",
    "animation",
    "cinematic",
  ];

  // Content type options
  const contentTypes = [
    { value: "all", label: "All Media", icon: Grid },
    { value: "images", label: "Images Only", icon: Image },
    { value: "videos", label: "Videos Only", icon: Video },
  ];

  // Sort options
  const sortOptions = [
    { value: "date", label: "Date Created" },
    { value: "name", label: "Filename" },
    { value: "type", label: "Media Type" },
  ];

  // Detect category from prompt
  const detectCategory = (prompt: string): string => {
    const promptLower = prompt.toLowerCase();
    if (promptLower.includes("portrait") || promptLower.includes("face"))
      return "portraits";
    if (promptLower.includes("landscape") || promptLower.includes("scenery"))
      return "landscapes";
    if (promptLower.includes("anime") || promptLower.includes("manga"))
      return "anime";
    if (promptLower.includes("realistic") || promptLower.includes("photo"))
      return "realistic";
    if (promptLower.includes("animation") || promptLower.includes("moving"))
      return "animation";
    if (promptLower.includes("cinematic") || promptLower.includes("movie"))
      return "cinematic";
    return "objects";
  };

  // Filter and sort items
  const filteredAndSortedItems = allMediaItems
    .filter((item) => {
      const matchesSearch =
        item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.filename.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" ||
        detectCategory(item.prompt) === selectedCategory;

      const matchesContentType =
        selectedContentType === "all" ||
        (selectedContentType === "images" && item.type === "image") ||
        (selectedContentType === "videos" && item.type === "video");

      return matchesSearch && matchesCategory && matchesContentType;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          comparison =
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case "name":
          comparison = a.filename.localeCompare(b.filename);
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Utility functions
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getSelectedItems = (): MediaItem[] => {
    return allMediaItems.filter((item) => selectedItems.has(item.id));
  };

  // Toggle bookmark
  const toggleBookmark = (itemId: string) => {
    const item = allMediaItems.find((i) => i.id === itemId);
    if (!item) return;

    if (item.type === "image") {
      setGeneratedImages((prev) =>
        prev.map((img) =>
          img.id === itemId ? { ...img, isBookmarked: !img.isBookmarked } : img
        )
      );
    } else {
      setGeneratedVideos((prev) =>
        prev.map((vid) =>
          vid.id === itemId ? { ...vid, isBookmarked: !vid.isBookmarked } : vid
        )
      );
    }
  };

  // Download item
  const downloadItem = async (item: MediaItem) => {
    try {
      const url =
        item.type === "image"
          ? item.blobUrl || item.imageUrl
          : item.blobUrl || item.videoUrl;

      let downloadUrl = url;

      // For items without blob URL, try to fetch as blob
      if (!item.blobUrl) {
        try {
          const response = await fetch(url, { method: "GET", mode: "cors" });
          if (response.ok) {
            const blob = await response.blob();
            downloadUrl = URL.createObjectURL(blob);
          }
        } catch (error) {
          console.error("Failed to fetch as blob:", error);
        }
      }

      // Create download link
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = item.filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL if we created it
      if (downloadUrl !== url) {
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
      }
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open in new tab
      const url = item.type === "image" ? item.imageUrl : item.videoUrl;
      window.open(url, "_blank");
    }
  };

  // Handle item selection
  const toggleItemSelection = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedItems.map((item) => item.id)));
    }
  };

  // Handle item click for modal
  const handleItemClick = (item: MediaItem) => {
    setSelectedItemForModal(item);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedItemForModal(null);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Video player controls for modal
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Check if file is a video
  const isVideoFile = (filename: string): boolean => {
    const ext = filename.toLowerCase();
    return (
      ext.endsWith(".mp4") ||
      ext.endsWith(".webm") ||
      ext.endsWith(".avi") ||
      ext.endsWith(".mov")
    );
  };

  // Modal Component with improved UI
  const MediaModal: React.FC = () => {
    if (!showModal || !selectedItemForModal) return null;

    const currentItem = selectedItemForModal;
    const isVideo = currentItem.type === "video";

    useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          closeModal();
        } else if (
          e.key === " " &&
          isVideo &&
          isVideoFile(currentItem.filename)
        ) {
          e.preventDefault();
          togglePlayPause();
        }
      };

      if (showModal) {
        document.addEventListener("keydown", handleKeyPress);
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.removeEventListener("keydown", handleKeyPress);
        document.body.style.overflow = "unset";
      };
    }, [showModal, isPlaying, isVideo]);

    return (
      <div
        className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
        onClick={closeModal}
      >
        {/* Modal Container */}
        <div
          className="relative w-full h-full max-w-7xl max-h-[95vh] flex flex-col bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isVideo
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                      : "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                  }`}
                >
                  {isVideo ? "VIDEO" : "IMAGE"}
                </div>
                <h3 className="text-white text-lg font-semibold truncate max-w-md">
                  {currentItem.filename}
                </h3>
              </div>

              <button
                onClick={closeModal}
                className="bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all duration-200 hover:scale-105"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Media Content */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {isVideo ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <EnhancedVideoDisplay
                  video={currentItem as GeneratedVideo}
                  className="max-w-full max-h-full object-contain"
                  controls={false}
                  autoPlay={true}
                  muted={isMuted}
                  loop={true}
                  onLoadedData={() =>
                    console.log(`Modal video loaded: ${currentItem.filename}`)
                  }
                />

                {/* Custom video element for controls */}
                {isVideoFile(currentItem.filename) && (
                  <video
                    ref={videoRef}
                    src={currentItem.videoUrl}
                    className="hidden"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    crossOrigin="anonymous"
                  />
                )}

                {/* Video Controls Overlay */}
                {isVideoFile(currentItem.filename) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
                    {/* Progress Bar */}
                    <div className="mb-6">
                      <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={(value) => handleSeek(value[0])}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-300 mt-2">
                        <span>{formatDuration(currentTime)}</span>
                        <span>{formatDuration(duration)}</span>
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-center space-x-6">
                      <Button
                        variant="ghost"
                        size="lg"
                        className="text-white hover:bg-white/20 rounded-full p-4"
                        onClick={() =>
                          handleSeek(Math.max(0, currentTime - 10))
                        }
                      >
                        <SkipBack size={24} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="lg"
                        className="text-white hover:bg-white/20 rounded-full p-6 bg-white/10"
                        onClick={togglePlayPause}
                      >
                        {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                      </Button>

                      <Button
                        variant="ghost"
                        size="lg"
                        className="text-white hover:bg-white/20 rounded-full p-4"
                        onClick={() =>
                          handleSeek(Math.min(duration, currentTime + 10))
                        }
                      >
                        <SkipForward size={24} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="lg"
                        className="text-white hover:bg-white/20 rounded-full p-4"
                        onClick={toggleMute}
                      >
                        {isMuted ? (
                          <VolumeX size={24} />
                        ) : (
                          <Volume2 size={24} />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Video Type Indicator */}
                {!isVideoFile(currentItem.filename) && (
                  <div className="absolute bottom-6 left-6 bg-black/80 text-white text-sm px-4 py-2 rounded-lg backdrop-blur-sm">
                    Animated WebP - Auto-playing
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8">
                <ComfyUIImage
                  image={currentItem as GeneratedImage}
                  alt={currentItem.filename}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Footer Info Panel */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-6">
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              {/* Media Info */}
              <div className="mb-4">
                <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                  {currentItem.prompt}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-gray-400 text-xs uppercase tracking-wide">
                      Type
                    </span>
                    <div className="text-white capitalize font-medium">
                      {currentItem.type}
                    </div>
                  </div>

                  {currentItem.settings && (
                    <div className="space-y-1">
                      <span className="text-gray-400 text-xs uppercase tracking-wide">
                        Resolution
                      </span>
                      <div className="text-white font-medium">
                        {currentItem.settings.width}×
                        {currentItem.settings.height}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-gray-400 text-xs uppercase tracking-wide">
                      Created
                    </span>
                    <div className="text-white font-medium">
                      {formatDate(currentItem.timestamp)}
                    </div>
                  </div>

                  {currentItem.type === "video" && (
                    <div className="space-y-1">
                      <span className="text-gray-400 text-xs uppercase tracking-wide">
                        Duration
                      </span>
                      <div className="text-white font-medium">
                        {formatDuration(
                          (currentItem as GeneratedVideo).duration
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Source Image for Videos */}
                {currentItem.type === "video" &&
                  "sourceImage" in currentItem &&
                  currentItem.sourceImage && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <span className="text-gray-400 text-xs uppercase tracking-wide">
                        Source Image
                      </span>
                      <div className="text-gray-300 text-sm mt-1">
                        {currentItem.sourceImage}
                      </div>
                    </div>
                  )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"
                    onClick={() => downloadItem(currentItem)}
                  >
                    <Download size={16} className="mr-2" />
                    Download
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className={`rounded-lg px-4 py-2 border transition-all ${
                      currentItem.isBookmarked
                        ? "bg-yellow-600/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-600/30"
                        : "bg-white/5 border-white/20 text-white hover:bg-white/10"
                    }`}
                    onClick={() => toggleBookmark(currentItem.id)}
                  >
                    <Star
                      size={16}
                      className={`mr-2 ${
                        currentItem.isBookmarked ? "fill-current" : ""
                      }`}
                    />
                    {currentItem.isBookmarked ? "Bookmarked" : "Bookmark"}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-lg px-4 py-2"
                    onClick={() =>
                      window.open(
                        currentItem.type === "image"
                          ? currentItem.imageUrl
                          : currentItem.videoUrl,
                        "_blank"
                      )
                    }
                  >
                    <Eye size={16} className="mr-2" />
                    View Original
                  </Button>
                </div>

                {/* Keyboard Shortcuts Hint */}
                <div className="hidden md:flex items-center space-x-4 text-xs text-gray-400">
                  <span className="flex items-center space-x-1">
                    <kbd className="px-2 py-1 bg-black/50 rounded border border-white/20">
                      ESC
                    </kbd>
                    <span>Close</span>
                  </span>
                  {isVideo && (
                    <span className="flex items-center space-x-1">
                      <kbd className="px-2 py-1 bg-black/50 rounded border border-white/20">
                        SPACE
                      </kbd>
                      <span>Play/Pause</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white">
                Combined Media Gallery
              </CardTitle>
              <CardDescription className="text-gray-400">
                View and manage all your generated images and videos in one
                place
              </CardDescription>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-black/60 border-white/10 text-white"
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
              >
                {viewMode === "grid" ? <List size={16} /> : <Grid size={16} />}
              </Button>

              {/* Select All Button */}
              {filteredAndSortedItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-black/60 border-white/10 text-white"
                  onClick={handleSelectAll}
                >
                  {selectedItems.size === filteredAndSortedItems.length ? (
                    <>
                      <X size={16} className="mr-1" />
                      Clear All
                    </>
                  ) : (
                    <>
                      <Check size={16} className="mr-1" />
                      Select All ({filteredAndSortedItems.length})
                    </>
                  )}
                </Button>
              )}

              {/* Bulk Actions */}
              {selectedItems.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-blue-600/20 border-blue-500/30 text-blue-300"
                    onClick={async () => {
                      const selectedItemsArray = getSelectedItems();
                      for (const item of selectedItemsArray) {
                        await downloadItem(item);
                        await new Promise((resolve) =>
                          setTimeout(resolve, 200)
                        );
                      }
                    }}
                  >
                    <Download size={16} className="mr-1" />
                    Download ({selectedItems.size})
                  </Button>

                  {onSendToPromptGenerator && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-purple-900/30 border-purple-500/30 text-purple-300"
                      onClick={() => {
                        onSendToPromptGenerator(getSelectedItems());
                        setSelectedItems(new Set());
                      }}
                    >
                      <Wand2 size={16} className="mr-1" />
                      Prompt Gen ({selectedItems.size})
                    </Button>
                  )}

                  {onAddToVault && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-green-900/30 border-green-500/30 text-green-300"
                      onClick={() => {
                        onAddToVault(getSelectedItems());
                        setSelectedItems(new Set());
                      }}
                    >
                      <FileImage size={16} className="mr-1" />
                      Add to Vault ({selectedItems.size})
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-red-900/30 border-red-500/30 text-red-300"
                    onClick={() => {
                      const selectedItemsArray = getSelectedItems();

                      // Remove from appropriate arrays
                      setGeneratedImages((prev) =>
                        prev.filter(
                          (img) =>
                            !selectedItemsArray.some(
                              (item) => item.id === img.id
                            )
                        )
                      );
                      setGeneratedVideos((prev) =>
                        prev.filter(
                          (vid) =>
                            !selectedItemsArray.some(
                              (item) => item.id === vid.id
                            )
                        )
                      );

                      setSelectedItems(new Set());
                    }}
                  >
                    <Trash size={16} className="mr-1" />
                    Delete ({selectedItems.size})
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex space-x-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <Input
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/60 border-white/10 text-white pl-10"
                />
              </div>
            </div>

            <Select
              value={selectedContentType}
              onValueChange={setSelectedContentType}
            >
              <SelectTrigger className="w-48 bg-black/60 border-white/10 text-white">
                <Filter size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/10 text-white">
                {contentTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center">
                        <IconComponent size={16} className="mr-2" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-48 bg-black/60 border-white/10 text-white">
                <Filter size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/10 text-white">
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value: "date" | "name" | "type") =>
                setSortBy(value)
              }
            >
              <SelectTrigger className="w-36 bg-black/60 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/10 text-white">
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="bg-black/60 border-white/10 text-white"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-6 text-sm text-gray-400 mt-4">
            <span>Total: {allMediaItems.length}</span>
            <span>Images: {generatedImages.length}</span>
            <span>Videos: {generatedVideos.length}</span>
            <span>Filtered: {filteredAndSortedItems.length}</span>
            {selectedItems.size > 0 && (
              <span className="text-purple-400">
                Selected: {selectedItems.size}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {filteredAndSortedItems.length > 0 ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                  : "space-y-4"
              }
            >
              {filteredAndSortedItems.map((item) => (
                <div
                  key={item.id}
                  className={`group relative bg-black/40 rounded-lg overflow-hidden border border-white/10 hover:border-purple-400/30 transition-all cursor-pointer ${
                    selectedItems.has(item.id) ? "ring-2 ring-purple-400" : ""
                  } ${viewMode === "list" ? "flex space-x-4 p-4" : ""}`}
                  onClick={() => handleItemClick(item)}
                >
                  {/* Media Content */}
                  <div
                    className={`relative ${
                      viewMode === "grid"
                        ? "aspect-square"
                        : "w-24 h-24 flex-shrink-0"
                    }`}
                  >
                    {item.type === "image" ? (
                      <ComfyUIImage
                        image={item}
                        alt={item.filename}
                        className={
                          viewMode === "grid" ? "aspect-square" : "w-24 h-24"
                        }
                      />
                    ) : (
                      <EnhancedVideoDisplay
                        video={item}
                        className={
                          viewMode === "grid" ? "aspect-square" : "w-24 h-24"
                        }
                        autoPlay={true}
                        muted={true}
                        loop={true}
                        controls={false}
                        onLoadedData={() =>
                          console.log(`Gallery video loaded: ${item.filename}`)
                        }
                      />
                    )}

                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <button
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                          selectedItems.has(item.id)
                            ? "bg-purple-600 border-purple-600"
                            : "bg-black/50 border-white/30 hover:border-white/60"
                        }`}
                        onClick={(e) => toggleItemSelection(item.id, e)}
                      >
                        {selectedItems.has(item.id) && (
                          <Check size={14} className="text-white" />
                        )}
                      </button>
                    </div>

                    {/* Type Badge */}
                    <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {item.type === "image" ? "IMG" : "VID"}
                    </div>

                    {/* Duration for videos */}
                    {item.type === "video" && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        {formatDuration((item as GeneratedVideo).duration)}
                      </div>
                    )}

                    {/* Status Badges */}
                    <div className="absolute top-2 right-2 flex space-x-1">
                      {item.isBookmarked && (
                        <div className="w-6 h-6 bg-yellow-600/80 rounded flex items-center justify-center">
                          <Star size={12} className="text-white fill-current" />
                        </div>
                      )}
                      {item.isInVault && (
                        <div className="w-6 h-6 bg-purple-600/80 rounded flex items-center justify-center">
                          <FileImage size={12} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      {item.type === "video" ? (
                        <div className="flex items-center space-x-2">
                          <Play size={24} className="text-white" />
                          <span className="text-white text-xs">
                            {formatDuration((item as GeneratedVideo).duration)}
                          </span>
                        </div>
                      ) : (
                        <Eye size={24} className="text-white" />
                      )}
                    </div>
                  </div>

                  {/* Item Info */}
                  <div
                    className={`${
                      viewMode === "grid" ? "p-3" : "flex-1 min-w-0"
                    }`}
                  >
                    <h4 className="text-white text-sm font-medium truncate mb-1">
                      {item.filename}
                    </h4>

                    <p className="text-gray-400 text-xs line-clamp-2 mb-2">
                      {item.prompt}
                    </p>

                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="capitalize">{item.type}</span>
                      {item.settings && (
                        <span>
                          {item.settings.width}×{item.settings.height}
                        </span>
                      )}
                    </div>

                    {/* Additional info for list view */}
                    {viewMode === "list" && (
                      <div className="text-xs text-gray-500 mt-1 space-y-1">
                        <div>Created: {formatDate(item.timestamp)}</div>
                        {item.type === "video" &&
                          "sourceImage" in item &&
                          item.sourceImage && (
                            <div>Source: {item.sourceImage}</div>
                          )}
                        {item.type === "video" && (
                          <div>
                            Duration:{" "}
                            {formatDuration((item as GeneratedVideo).duration)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Grid className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
              <p className="text-gray-400 text-lg mb-2">No media found</p>
              <p className="text-gray-500 text-sm">
                {searchQuery ||
                selectedCategory !== "all" ||
                selectedContentType !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Generate some images or videos to get started"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Modal */}
      <MediaModal />
    </>
  );
};

export default CombinedGallery;
