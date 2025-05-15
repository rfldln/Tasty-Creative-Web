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
} from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("sideBySide");
  const [maxDuration, setMaxDuration] = useState(5); // Default max duration in seconds

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
      icon: <Rows3 className="w-5 h-5" />,
      cols: 1,
      rows: 3,
    },
    triptychVertical: {
      name: "Vertical Triptych",
      icon: <Columns3 className="w-5 h-5" />,
      cols: 3,
      rows: 1,
    },
    grid2x2: {
      name: "2×2 Grid",
      icon: <Grid2X2 className="w-5 h-5" />,
      cols: 2,
      rows: 2,
    },
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

  // Function to handle video file selection
  const handleVideoChange = (index: number, file: File | null) => {
    if (!file) return;

    // Update the clips state immediately with just the file
    setVideoClips((prev) => {
      const newClips = [...prev];
      newClips[index] = {
        file: file,
        startTime: 0,
        endTime: 5, // Default to 5 seconds or max duration
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
  }, [totalCells]);

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
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mb-6">
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

            {/* Trimming preview */}
            <div className="relative mb-4">
              <video
                ref={(el) => {
                  if (el) {
                    videoRefs.current[activeVideoIndex] = el;

                    // Sync video to startTime
                    el.onloadedmetadata = () => {
                      el.currentTime = videoClips[activeVideoIndex].startTime;
                    };

                    // Pause when reaching endTime
                    el.ontimeupdate = () => {
                      if (
                        el.currentTime >= videoClips[activeVideoIndex].endTime
                      ) {
                        el.pause();
                        setIsPlaying(false);
                      }
                    };
                  }
                }}
                src={URL.createObjectURL(videoClips[activeVideoIndex].file!)}
                className="rounded w-full aspect-video object-cover"
                controls={false}
                autoPlay
                loop
              />
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

        {/* Max Duration Setting */}
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
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg transition-colors">
            Cancel
          </button>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors">
            Create GIF
          </button>
        </div>
      </div>
    </div>
  );
};

export default GifMaker;
