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
  Heart,
  Eraser,
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
}

// Enhanced Video Display Component (simplified)
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
    <div className={`relative ${className}`}>
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
      />
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
}) => {
  // UI states
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContentType, setSelectedContentType] = useState("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
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

  // Filter and sort items
  const filteredAndSortedItems = allMediaItems
    .filter((item) => {
      const matchesSearch =
        item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.filename.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesContentType =
        selectedContentType === "all" ||
        (selectedContentType === "images" && item.type === "image") ||
        (selectedContentType === "videos" && item.type === "video");

      const matchesFavorites = !showFavoritesOnly || item.isBookmarked;

      return matchesSearch && matchesContentType && matchesFavorites;
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

  // Clear selections
  const clearSelections = () => {
    setSelectedItems(new Set());
  };

  // Bulk favorite toggle
  const toggleBulkFavorite = () => {
    const selectedItemsArray = getSelectedItems();
    const allFavorited = selectedItemsArray.every((item) => item.isBookmarked);

    // If all selected items are favorited, unfavorite them. Otherwise, favorite all.
    const shouldFavorite = !allFavorited;

    selectedItemsArray.forEach((item) => {
      if (item.type === "image") {
        setGeneratedImages((prev) =>
          prev.map((img) =>
            img.id === item.id ? { ...img, isBookmarked: shouldFavorite } : img
          )
        );
      } else {
        setGeneratedVideos((prev) =>
          prev.map((vid) =>
            vid.id === item.id ? { ...vid, isBookmarked: shouldFavorite } : vid
          )
        );
      }
    });
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

  // Modal Component with separated info panel
  const MediaModal: React.FC = () => {
    if (!showModal || !selectedItemForModal) return null;

    // Get the current state of the item (important for bookmark updates)
    const currentItem =
      allMediaItems.find((item) => item.id === selectedItemForModal.id) ||
      selectedItemForModal;
    const isVideo = currentItem.type === "video";
    const [showInfo, setShowInfo] = useState(false);

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
        } else if (e.key === "i" || e.key === "I") {
          e.preventDefault();
          setShowInfo(!showInfo);
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
    }, [showModal, isPlaying, isVideo, showInfo]);

    return (
      <div className="fixed inset-0 bg-black/95 z-50" onClick={closeModal}>
        {/* Main Modal - Full Screen */}
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {/* Close Button */}
          <button
            onClick={closeModal}
            className="absolute top-6 right-6 z-30 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all duration-200 hover:scale-105"
          >
            <X size={20} />
          </button>

          {/* Info Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(!showInfo);
            }}
            className="absolute top-6 left-6 z-30 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all duration-200 hover:scale-105"
          >
            <Eye size={20} />
          </button>

          {/* Media Content - Natural Size */}
          <div
            className="relative max-w-full max-h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideo ? (
              <div className="relative">
                <video
                  src={currentItem.videoUrl}
                  className="block max-w-[85vw] max-h-[85vh]"
                  autoPlay={true}
                  muted={isMuted}
                  loop={true}
                  crossOrigin="anonymous"
                  style={{
                    width: "auto",
                    height: "auto",
                    maxWidth: "85vw",
                    maxHeight: "85vh",
                    objectFit: "contain",
                  }}
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
                    Animated WebP
                  </div>
                )}
              </div>
            ) : (
              <img
                src={currentItem.blobUrl || currentItem.imageUrl}
                alt={currentItem.filename}
                className="block max-w-[95vw] max-h-[95vh]"
                style={{
                  width: "auto",
                  height: "auto",
                  maxWidth: "95vw",
                  maxHeight: "95vh",
                  objectFit: "contain",
                }}
              />
            )}
          </div>

          {/* Action Buttons - Bottom Center */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
            <div className="flex items-center space-x-3 bg-black/90 backdrop-blur-sm rounded-full px-8 py-4 border border-white/20 shadow-2xl">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-3 font-medium transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadItem(currentItem);
                }}
              >
                <Download size={18} className="mr-2" />
                Download
              </Button>

              <Button
                size="sm"
                className={`rounded-full px-6 py-3 font-medium transition-all duration-200 shadow-lg ${
                  currentItem.isBookmarked
                    ? "bg-yellow-500 hover:bg-yellow-600 text-black shadow-yellow-500/25"
                    : "bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 hover:border-gray-500"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(currentItem.id);
                }}
              >
                <Star
                  size={18}
                  className={`mr-2 transition-all duration-200 ${
                    currentItem.isBookmarked ? "fill-current" : ""
                  }`}
                />
                Favorite
              </Button>

              <Button
                size="sm"
                className={`rounded-full px-6 py-3 font-medium transition-all duration-200 shadow-lg ${
                  showInfo
                    ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/25"
                    : "bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 hover:border-gray-500"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfo(!showInfo);
                }}
              >
                <Eye size={18} className="mr-2" />
                {showInfo ? "Hide Info" : "Show Info"}
              </Button>
            </div>
          </div>

          {/* Keyboard Shortcuts Hint - Bottom Right */}
          <div className="absolute bottom-6 right-6 z-30 hidden md:flex items-center space-x-4 text-xs text-gray-400">
            <span className="flex items-center space-x-1 bg-black/50 rounded px-2 py-1">
              <kbd className="px-1 py-0.5 bg-black/50 rounded border border-white/20">
                ESC
              </kbd>
              <span>Close</span>
            </span>
            <span className="flex items-center space-x-1 bg-black/50 rounded px-2 py-1">
              <kbd className="px-1 py-0.5 bg-black/50 rounded border border-white/20">
                I
              </kbd>
              <span>Info</span>
            </span>
            {isVideo && (
              <span className="flex items-center space-x-1 bg-black/50 rounded px-2 py-1">
                <kbd className="px-1 py-0.5 bg-black/50 rounded border border-white/20">
                  SPACE
                </kbd>
                <span>Play/Pause</span>
              </span>
            )}
          </div>
        </div>

        {/* Info Side Panel - Slide from right */}
        <div
          className={`absolute top-0 right-0 h-full w-96 bg-black/95 backdrop-blur-xl border-l border-white/10 transform transition-transform duration-300 ease-in-out z-40 ${
            showInfo ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">
                Media Details
              </h3>
              <button
                onClick={() => setShowInfo(false)}
                className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {/* Type Badge */}
              <div
                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                  isVideo
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                }`}
              >
                {isVideo ? "VIDEO" : "IMAGE"}
              </div>

              {/* Filename */}
              <div>
                <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                  Filename
                </h4>
                <p className="text-white text-sm font-medium break-all">
                  {currentItem.filename}
                </p>
              </div>

              {/* Prompt */}
              <div>
                <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                  Prompt
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {currentItem.prompt}
                </p>
              </div>

              {/* Technical Details */}
              <div className="grid grid-cols-1 gap-4">
                {currentItem.settings && (
                  <div>
                    <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                      Resolution
                    </h4>
                    <p className="text-white font-medium">
                      {currentItem.settings.width} ×{" "}
                      {currentItem.settings.height}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                    Created
                  </h4>
                  <p className="text-white font-medium">
                    {formatDate(currentItem.timestamp)}
                  </p>
                </div>

                {currentItem.type === "video" && (
                  <div>
                    <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                      Duration
                    </h4>
                    <p className="text-white font-medium">
                      {formatDuration((currentItem as GeneratedVideo).duration)}
                    </p>
                  </div>
                )}

                {/* Source Image for Videos */}
                {currentItem.type === "video" &&
                  "sourceImage" in currentItem &&
                  currentItem.sourceImage && (
                    <div>
                      <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                        Source Image
                      </h4>
                      <p className="text-gray-300 text-sm break-all">
                        {currentItem.sourceImage}
                      </p>
                    </div>
                  )}

                {/* Additional Settings */}
                {currentItem.settings && (
                  <div>
                    <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-2">
                      Generation Settings
                    </h4>
                    <div className="space-y-2 text-sm">
                      {currentItem.type === "video" &&
                        currentItem.settings.fps && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Frame Rate:</span>
                            <span className="text-white">
                              {currentItem.settings.fps} fps
                            </span>
                          </div>
                        )}
                      {currentItem.type === "video" &&
                        currentItem.settings.frameCount && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Frame Count:</span>
                            <span className="text-white">
                              {currentItem.settings.frameCount}
                            </span>
                          </div>
                        )}
                      {currentItem.settings.model && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Model:</span>
                          <span
                            className="text-white text-xs truncate max-w-32"
                            title={currentItem.settings.model}
                          >
                            {currentItem.settings.model}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center space-x-3">
                  {currentItem.isBookmarked && (
                    <div className="flex items-center space-x-1 text-yellow-400 text-sm">
                      <Star size={14} className="fill-current" />
                      <span>Favorited</span>
                    </div>
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
              <CardTitle className="text-white">Media Gallery</CardTitle>
              <CardDescription className="text-gray-400">
                View and manage all your generated images and videos
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

              {/* Clear Selections Button */}
              {selectedItems.size > 0 &&
                selectedItems.size < filteredAndSortedItems.length && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-600/20 border-gray-500/30 text-gray-300"
                    onClick={clearSelections}
                  >
                    <Eraser size={16} className="mr-1" />
                    Clear ({selectedItems.size})
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

                  <Button
                    variant="outline"
                    size="sm"
                    className={`${
                      getSelectedItems().every((item) => item.isBookmarked)
                        ? "bg-yellow-600/30 border-yellow-500/50 text-yellow-300"
                        : "bg-yellow-600/20 border-yellow-500/30 text-yellow-300"
                    }`}
                    onClick={toggleBulkFavorite}
                  >
                    <Star
                      size={16}
                      className={`mr-1 ${
                        getSelectedItems().every((item) => item.isBookmarked)
                          ? "fill-current"
                          : ""
                      }`}
                    />
                    {getSelectedItems().every((item) => item.isBookmarked)
                      ? `Unfavorite (${selectedItems.size})`
                      : `Favorite (${selectedItems.size})`}
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

            <Button
              variant="outline"
              size="sm"
              className={`px-4 ${
                showFavoritesOnly
                  ? "bg-yellow-600/30 border-yellow-500/50 text-yellow-300"
                  : "bg-black/60 border-white/10 text-white"
              }`}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Heart
                size={16}
                className={`mr-2 ${showFavoritesOnly ? "fill-current" : ""}`}
              />
              Favorites Only
            </Button>

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
            {showFavoritesOnly && (
              <span className="text-yellow-400">
                Favorites:{" "}
                {allMediaItems.filter((item) => item.isBookmarked).length}
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
                selectedContentType !== "all" ||
                showFavoritesOnly
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
