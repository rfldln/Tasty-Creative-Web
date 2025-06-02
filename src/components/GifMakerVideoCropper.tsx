/* eslint-disable @typescript-eslint/no-explicit-any */
import { Clock, UploadIcon, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useDrag } from "react-use-gesture";
import GifVaultSelector from "./GifVaultSelector";

type Template = {
  cols: number;
  rows: number;
  icon: React.ReactNode;
  name: string;
};

type Templates = {
  [key: string]: Template;
};

type VideoClip = {
  file: File | null;
  startTime: number;
  endTime: number;
  duration: number;
  scale?: number;
  positionX?: number;
  positionY?: number;
};

type GifMakerVideoCropperProps = {
  templates: Templates;
  videoClips: VideoClip[];
  setSelectedTemplate: (template: string) => void;
  setVideoClips: (
    clips: VideoClip[] | ((prevClips: VideoClip[]) => VideoClip[])
  ) => void;
  setActiveVideoIndex: (index: number | null) => void;
  videoRefs: React.RefObject<(HTMLVideoElement | null)[]>;
  selectedTemplate: string;
  outputGridRef: React.RefObject<HTMLDivElement | null>;
  activeVideoIndex: number | null;
  setIsPlaying: (isPlaying: boolean) => void;
  handleVideoChange: (index: number, file: File | null) => void;
  totalCells: number;
  setDimensions: (width: number, height: number) => void;
  currentTime?: number;
  isPlaying?: boolean;
  onCurrentTimeChange?: (time: number) => void;
  videoUrls: (string | null)[];
  vaultName?: string;
};


const GifMakerVideoCropper = ({
  templates,
  videoClips,
  setSelectedTemplate,
  setVideoClips,
  setActiveVideoIndex,
  videoRefs,
  selectedTemplate,
  outputGridRef,
  activeVideoIndex,
  setIsPlaying,
  handleVideoChange,
  totalCells,
  setDimensions,
  currentTime = 0,
  videoUrls,
  vaultName,
}: GifMakerVideoCropperProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const baseHeight = 360;
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const dragTargetRef = useRef<HTMLDivElement | null>(null);

  // Calculate aspect ratio dimensions
  const getAspectRatioSize = (layout: string) => {
    const template = templates[layout];
    if (!template) return { width: baseHeight, height: baseHeight };

    switch (layout) {
      case "Single":
        return { width: baseHeight * (16 / 9), height: baseHeight };
      case "Side by Side":
        return { width: baseHeight * 2, height: baseHeight };
      case "Horizontal Triptych":
        return { width: baseHeight * 3, height: baseHeight };
      case "Vertical Triptych":
        return { width: baseHeight, height: baseHeight * 3 };
      case "2x2 Grid":
        return { width: baseHeight * 2, height: baseHeight * 2 };
      default:
        return {
          width: baseHeight * template.cols,
          height: baseHeight * template.rows,
        };
    }
  };

  // Handle video scaling with performance optimization
  const handleVideoScale = (index: number, newScale: number) => {
    const videoElement = videoRefs.current[index]?.parentElement;
    if (videoElement) {
      videoElement.style.setProperty("--scale", newScale.toString());
    }

    setVideoClips((prevClips: VideoClip[]) => {
      const newClips = [...prevClips];
      newClips[index] = {
        ...newClips[index],
        scale: Math.max(0.1, Math.min(3, newScale)),
      };
      return newClips;
    });
  };

  // Use react-use-gesture for smooth dragging
  const bind = useDrag(({ movement: [mx, my], down }) => {
    if (activeVideoIndex === null || !dragTargetRef.current) return;

    const currentClip = videoClips[activeVideoIndex];
    const baseX = currentClip?.positionX || 0;
    const baseY = currentClip?.positionY || 0;

    if (down) {
      // Apply live drag offset using base position + current drag movement
      const offsetX = baseX + mx * 0.3;
      const offsetY = baseY + my * 0.3;

      dragTargetRef.current.style.setProperty("--translate-x", `${offsetX}px`);
      dragTargetRef.current.style.setProperty("--translate-y", `${offsetY}px`);
    }

    if (!down) {
      // Persist final position to state
      setVideoClips((prevClips: VideoClip[]) => {
        const newClips = [...prevClips];
        newClips[activeVideoIndex] = {
          ...newClips[activeVideoIndex],
          positionX: baseX + mx * 0.3,
          positionY: baseY + my * 0.3,
        };
        return newClips;
      });

      // Clear temporary drag styles
      dragTargetRef.current.style.removeProperty("--translate-x");
      dragTargetRef.current.style.removeProperty("--translate-y");
    }
  });

  // Set up responsive container
  useEffect(() => {
    const updateContainerSize = () => {
      if (!containerRef.current || !outputGridRef.current) return;

      const aspectRatio = getAspectRatioSize(selectedTemplate);
      setDimensions(aspectRatio.width, aspectRatio.height);

      const containerWidth = containerRef.current.offsetWidth;

      let scale = 1;
      if (selectedTemplate !== "Single") {
        scale = Math.min(containerWidth / aspectRatio.width, 1);
      }

      outputGridRef.current.style.width = `${aspectRatio.width * scale}px`;
      outputGridRef.current.style.height = `${aspectRatio.height * scale}px`;
      outputGridRef.current.style.margin = "0 auto";
    };

    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    return () => window.removeEventListener("resize", updateContainerSize);
  }, [selectedTemplate]);

  useEffect(() => {
    const videoEls = videoRefs.current;
    const handlers: (() => void)[] = [];

    videoEls.forEach((video, i) => {
      if (!video || i === activeVideoIndex || !videoClips[i]) return;

      const clip = videoClips[i];
      const loopHandler = () => {
        if (video.currentTime >= clip.endTime) {
          video.currentTime = clip.startTime;
        }
      };

      video.addEventListener("timeupdate", loopHandler);
      video.play().catch(() => {});
      handlers.push(() => video.removeEventListener("timeupdate", loopHandler));
    });

    return () => {
      videoRefs.current.forEach((video) => video?.pause());
      handlers.forEach((cleanup) => cleanup());
    };
  }, [videoRefs, videoClips, activeVideoIndex]);

  // Video overlay with optimized drag handling
  const renderVideoOverlay = (index: number) => {
    if (!videoClips[index]?.file) return null;

    return (
      <div
        className="absolute inset-0 z-10 cursor-move"
        onMouseDown={() => setActiveVideoIndex(index)}
      />
    );
  };

  const handleOpenUploadModal = (index: number) => {
    setUploadingIndex(index);
    setUploadModalOpen(true);
  };

  const handleModalUpload = (file: File) => {
    if (uploadingIndex !== null) {
      handleVideoChange(uploadingIndex, file);
    }
  };

  return (
    <div className="flex-1">
      <GifVaultSelector
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleModalUpload}
        vaultName={vaultName}
      />

      <h2 className="text-xl font-semibold text-blue-300">GIF Template</h2>
      <p className="text-gray-300 mb-4">Choose a template for your GIF.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {Object.keys(templates).map((key) => (
          <button
            key={key}
            onClick={() => {
              videoClips.forEach((clip) => {
                if (clip.file)
                  URL.revokeObjectURL(URL.createObjectURL(clip.file));
              });

              setSelectedTemplate(key);
              setVideoClips(
                Array(templates[key].cols * templates[key].rows)
                  .fill(null)
                  .map(() => ({
                    file: null,
                    startTime: 0,
                    endTime: 5,
                    duration: 0,
                    scale: 1,
                    positionX: 0,
                    positionY: 0,
                  }))
              );
              setActiveVideoIndex(null);
              videoRefs.current = [];
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

      {/* Grid Preview */}
      <div className="mb-6">
        <h3 className="text-gray-300 mb-2 font-medium">Preview</h3>
        <div
          ref={containerRef}
          className="bg-gray-900 p-4 rounded-lg border border-gray-700"
        >
          <div
            ref={outputGridRef}
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${templates[selectedTemplate].cols}, 1fr)`,
              gridTemplateRows: `repeat(${templates[selectedTemplate].rows}, 1fr)`,
              gap: "2px",
              aspectRatio: `${getAspectRatioSize(selectedTemplate).width}/${
                getAspectRatioSize(selectedTemplate).height
              }`,
            }}
          >
            {Array.from({ length: totalCells }).map((_, i) => (
              <div key={i} className="relative">
                <div
                  className={`relative bg-gray-700 w-full h-full flex items-center justify-center text-gray-400 transition overflow-hidden ${
                    activeVideoIndex === i ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  {videoClips[i]?.file ? (
                    <>
                      <div
                        ref={i === activeVideoIndex ? dragTargetRef : null}
                        {...(i === activeVideoIndex ? bind() : {})}
                        className="w-full h-full relative overflow-hidden"
                        style={{
                          transform: `translate(var(--translate-x, ${
                            videoClips[i].positionX || 0
                          }px), var(--translate-y, ${
                            videoClips[i].positionY || 0
                          }px)) scale(var(--scale, ${
                            videoClips[i].scale || 1
                          }))`,
                          transformOrigin: "center",
                          willChange: "transform",
                        }}
                        onWheel={(e) => {
                          if (activeVideoIndex !== i) return;
                          e.preventDefault();
                          const delta = e.deltaY * -0.01;
                          handleVideoScale(
                            i,
                            (videoClips[i].scale || 1) + delta
                          );
                        }}
                      >
                        <video
                          ref={(el) => {
                            if (!el) return;
                            videoRefs.current[i] = el;
                          }}
                          src={videoUrls[i] || ""}
                          className="absolute inset-0 w-full h-full object-contain"
                          muted
                          playsInline
                          autoPlay={i === activeVideoIndex}
                          onLoadedMetadata={(e) => {
                            const video = e.currentTarget;
                            const clip = videoClips[i];

                            if (i === activeVideoIndex) {
                              // For active video, set to current time or start time
                              video.currentTime = currentTime || clip.startTime;
                              // Don't auto-play - let parent control
                            } else {
                              // For non-active videos, set up preview loop
                              video.currentTime = clip.startTime;

                              const loopVideo = () => {
                                if (video.currentTime >= clip.endTime) {
                                  video.currentTime = clip.startTime;
                                }
                              };

                              video.addEventListener("timeupdate", loopVideo);
                              video.play().catch(() => {});

                              // Return cleanup function
                              return () => {
                                video.removeEventListener(
                                  "timeupdate",
                                  loopVideo
                                );
                              };
                            }
                          }}
                        />
                        {renderVideoOverlay(i)}
                      </div>

                      {videoClips[i]?.file && activeVideoIndex === i && (
                        <div
                          key={`slider-${i}`}
                          className="absolute right-0 bottom-12 -mr-[41px] opacity-70 hover:opacity-100 transition-all duration-300"
                        >
                          <div className="flex flex-col items-end text-end justify-end">
                            <input
                              name={i.toString()}
                              id={`video-scale-${i}`}
                              type="range"
                              min="0.1"
                              max="3"
                              step="0.05"
                              value={videoClips[i].scale || 1}
                              onChange={(e) =>
                                handleVideoScale(i, parseFloat(e.target.value))
                              }
                              className="h-32 vertical-slider text-blue-500 accent-blue-500"
                              style={{
                                WebkitAppearance: "slider-vertical",
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-2 right-2 flex gap-2 z-30">
                        <button
                          className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full"
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveVideoIndex(i);
                            setIsPlaying(false);
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

                        <button
                          className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-full"
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenUploadModal(i);
                          }}
                        >
                          <UploadIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenUploadModal(i);
                      }}
                      className="absolute inset-0 bg-gray-700 text-gray-400 flex items-center justify-center cursor-pointer hover:bg-gray-600 transition z-10 w-full h-full"
                    >
                      <span className="text-sm flex items-center">
                        <Clock className="w-4 h-4 mr-1" /> Upload video
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GifMakerVideoCropper;