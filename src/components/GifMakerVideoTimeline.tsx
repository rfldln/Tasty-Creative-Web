import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause } from "lucide-react";

type VideoTimelineProps = {
  videoFile: File | null;
  duration: number;
  startTime?: number;
  endTime?: number | null;
  currentTime?: number;
  isPlaying?: boolean;
  onStartTimeChange?: (time: number) => void;
  onEndTimeChange?: (time: number) => void;
  onCurrentTimeChange?: (time: number) => void;
  onPlayPause?: () => void;
};

export const GifMakerVideoTimeline = ({
  videoFile,
  duration,
  startTime = 0,
  endTime = null,
  currentTime = 0,
  isPlaying = false,
  onStartTimeChange,
  onEndTimeChange,
  onCurrentTimeChange,
  onPlayPause,
}: VideoTimelineProps) => {
  const [frames, setFrames] = useState<{ time: number; src: string }[]>([]);
  const [isDragging, setIsDragging] = useState<
    "start" | "end" | "current" | null
  >(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  const actualEndTime = endTime || duration;
  const frameCount = 12; // Number of frames to extract

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Extract frames from video
  const extractFrames = useCallback(async () => {
    if (!videoFile || !duration) {
      console.log("Missing videoFile or duration:", {
        videoFile: !!videoFile,
        duration,
      });
      return;
    }

    console.log("Starting frame extraction for:", videoFile.name);

    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;

    try {
      await new Promise<void>((resolve, reject) => {
        video.addEventListener(
          "loadeddata",
          () => {
            console.log("Video loaded");
            resolve();
          },
          { once: true }
        );
        video.addEventListener("error", reject, { once: true });
        video.load();
      });

      await video
        .play()
        .then(() => video.pause())
        .catch(() => {});
      const aspectRatio = video.videoWidth / video.videoHeight;
      canvas.width = 160;
      canvas.height = Math.round(160 / aspectRatio);

      const seekToTime = (time: number): Promise<void> =>
        new Promise((resolve) => {
          const onSeeked = () => {
            requestAnimationFrame(() => {
              try {
                if (ctx) {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const frameDataUrl = canvas.toDataURL("image/jpeg", 0.8);
                  if (frameDataUrl && frameDataUrl !== "data:,") {
                    const frame = { time, src: frameDataUrl };
                    setFrames((prev) =>
                      [...prev, frame].sort((a, b) => a.time - b.time)
                    );
                  }
                }
              } catch (e) {
                console.error(
                  `Error capturing frame at ${time.toFixed(2)}s`,
                  e
                );
              }
              resolve();
            });
          };

          video.currentTime = time;
          video.addEventListener("seeked", onSeeked, { once: true });

          setTimeout(() => {
            video.removeEventListener("seeked", onSeeked);
            console.warn(`Seek timeout at ${time.toFixed(2)}s`);
            resolve();
          }, 500);
        });

      // Start with empty frames
      setFrames([]);

      for (let i = 0; i < frameCount; i++) {
        const time = (duration / frameCount) * i;
        await seekToTime(time);
      }

      console.log("All frames extracted.");
    } catch (err) {
      console.error("Frame extraction failed:", err);
      setFrames([]);
    } finally {
      URL.revokeObjectURL(videoUrl);
    }
  }, [videoFile, duration, frameCount]);

  useEffect(() => {
    extractFrames();
  }, [extractFrames]);

  useEffect(() => {
    extractFrames();
  }, [extractFrames]);

  // Handle mouse events for dragging
  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    type: "start" | "end" | "current"
  ) => {
    setIsDragging(type);
    setDragStartX(e.clientX);
    setDragStartValue(
      type === "start"
        ? startTime
        : type === "end"
        ? actualEndTime
        : currentTime
    );
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartX;
      const deltaTime = (deltaX / rect.width) * duration;
      const newValue = Math.max(
        0,
        Math.min(duration, dragStartValue + deltaTime)
      );

      if (isDragging === "start") {
        onStartTimeChange?.(Math.min(newValue, actualEndTime - 0.1));
      } else if (isDragging === "end") {
        onEndTimeChange?.(Math.max(newValue, startTime + 0.1));
      } else if (isDragging === "current") {
        onCurrentTimeChange?.(newValue);
      }
    },
    [
      isDragging,
      dragStartX,
      dragStartValue,
      duration,
      startTime,
      actualEndTime,
      onStartTimeChange,
      onEndTimeChange,
      onCurrentTimeChange,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle timeline click
  const handleTimelineClick = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (!timelineRef.current || isDragging) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = (clickX / rect.width) * duration;

    onCurrentTimeChange?.(clickTime);
  };

  // Calculate positions as percentages
  const startPercent = (startTime / duration) * 100;
  const endPercent = (actualEndTime / duration) * 100;
  const currentPercent = (currentTime / duration) * 100;

  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-300 font-medium">Timeline Editor</h3>
        <button
          onClick={onPlayPause}
          className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-full transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Time Info */}
      <div className="flex justify-between text-sm text-gray-400 mb-4">
        <span>Total: {formatTime(duration)}</span>
        <span>Selected: {formatTime(actualEndTime - startTime)}</span>
        <span>Current: {formatTime(currentTime)}</span>
      </div>

      {/* Timeline Container */}
      <div className="relative">
        {/* Frame Thumbnails with Interactive Timeline */}
        <div
          ref={timelineRef}
          className="relative flex rounded-lg overflow-hidden bg-gray-800 border border-gray-600 cursor-pointer"
          onClick={handleTimelineClick}
        >
          {frames.map((frame, index) => (
            <div key={index} className="flex-1 relative">
              <img
                src={frame.src}
                alt={`Frame ${index}`}
                className="w-full h-20 object-cover"
                draggable={false}
              />
              {/* Frame overlay for non-selected areas */}
              <div
                className="absolute inset-0  duration-200"
                style={{
                  opacity:
                    frame.time < startTime || frame.time > actualEndTime
                      ? 0.6
                      : 0,
                }}
              />
              {/* Frame time label */}
              <div className="absolute bottom-1 left-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
                {formatTime(frame.time)}
              </div>
            </div>
          ))}

          {/* Selected Range Overlay */}
          <div
            className="absolute top-0 bottom-0 border-l-2 border-r-2 border-gray-400 opacity-20  pointer-events-none"
            style={{
              left: `${startPercent}%`,
              width: `${endPercent - startPercent}%`,
            }}
          />

          {/* Current Time Indicator */}
          {/* <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-20 pointer-events-none"
            style={{ left: `${currentPercent}%` }}
          >
            <div className="absolute -bottom-6 -left-8 text-xs text-white px-2 py-1 rounded whitespace-nowrap">
              {formatTime(currentTime)}
            </div>
          </div> */}

          <div
            className="absolute w-full bg-black transition-opacity opacity-50 z-30 h-full"
            style={{ marginLeft: `${endPercent}%` }}
          ></div>

          {/* Start Time Handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-gray-400 cursor-col-resize z-30 hover:bg-gray-300 transition-colors"
            style={{ left: `${startPercent}%` }}
            onMouseDown={(e) => handleMouseDown(e, "start")}
          >
            <div className="absolute -top-2 -left-2 w-5 h-5 bg-gray-400 rounded-full border-2 border-white hover:bg-gray-300 transition-colors shadow-lg" />
            <div className="absolute -bottom-8 -left-8 text-xs text-gray-300 bg-gray-900 px-2 py-1 rounded whitespace-nowrap border border-gray-400">
              {formatTime(startTime)}
            </div>
          </div>

          {/* End Time Handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-gray-400 cursor-col-resize z-30 hover:bg-gray-300 transition-colors"
            style={{ left: `${endPercent}%` }}
            onMouseDown={(e) => handleMouseDown(e, "end")}
          >
            <div className="absolute -top-2 -left-2 w-5 h-5 bg-gray-400 rounded-full border-2 border-white hover:bg-gray-300 transition-colors shadow-lg" />
            <div className="absolute -bottom-8 -left-6 text-xs text-gray-300 bg-gray-900 px-2 py-1 rounded whitespace-nowrap border border-gray-400">
              {formatTime(actualEndTime)}
            </div>
          </div>

          {/* Playhead (draggable current time) */}
          <div
            className="absolute  w-1 h-full cursor-col-resize z-40 bg-white rounded-sm border "
            style={{ left: `calc(${currentPercent}% - 2px)` }}
            onMouseDown={(e) => handleMouseDown(e, "current")}
          ></div>
        </div>

        {/* Time Markers */}
        <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
          <span>0:00</span>
          <span>{formatTime(duration / 4)}</span>
          <span>{formatTime(duration / 2)}</span>
          <span>{formatTime((3 * duration) / 4)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};
