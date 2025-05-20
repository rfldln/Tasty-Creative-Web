/* eslint-disable @typescript-eslint/no-explicit-any */
import { Clock, UploadIcon } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { useDrag } from "react-use-gesture";

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
  setVideoClips: (clips: VideoClip[] | ((prevClips: VideoClip[]) => VideoClip[])) => void;
  setActiveVideoIndex: (index: number | null) => void;
  videoRefs: React.RefObject<(HTMLVideoElement | null)[]>;
  selectedTemplate: string;
  outputGridRef: React.RefObject<HTMLDivElement | null>;
  activeVideoIndex: number | null;
  setIsPlaying: (isPlaying: boolean) => void;
  handleVideoChange: (index: number, file: File | null) => void;
  totalCells: number;
  setDimensions: (width: number, height: number) => void;
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
}: GifMakerVideoCropperProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const baseHeight = 360;
  const uploadInputRefs = useRef<HTMLInputElement[]>([]);
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
      const scale = Math.min(containerWidth / aspectRatio.width, 1);

      outputGridRef.current.style.width = `${aspectRatio.width * scale}px`;
      outputGridRef.current.style.height = `${aspectRatio.height * scale}px`;
      outputGridRef.current.style.margin = "0 auto";
    };

    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    return () => window.removeEventListener("resize", updateContainerSize);
  }, [selectedTemplate]);

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


  return (
    <>
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
                            if (!el || !videoClips[i]?.file) return;
                            videoRefs.current[i] = el;

                            let animationFrameId: number;
                            const loopPlayback = () => {
                              if (el.currentTime >= videoClips[i].endTime) {
                                el.currentTime = videoClips[i].startTime;
                                el.play().catch(() => {});
                              }
                              animationFrameId =
                                requestAnimationFrame(loopPlayback);
                            };

                            el.addEventListener("loadeddata", () => {
                              el.currentTime = videoClips[i].startTime;
                              el.play().catch(() => {});
                              loopPlayback();
                            });

                            el.addEventListener("emptied", () => {
                              cancelAnimationFrame(animationFrameId);
                            });
                          }}
                          src={
                            videoClips[i].file
                              ? URL.createObjectURL(videoClips[i].file)
                              : ""
                          }
                          className="absolute inset-0 w-full h-full object-contain"
                          muted
                          playsInline
                          loop={false}
                        />
                        {renderVideoOverlay(i)}
                      </div>

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

                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) =>
                            handleVideoChange(i, e.target.files?.[0] || null)
                          }
                          className="hidden"
                          ref={(el) => {
                            if (el) uploadInputRefs.current[i] = el;
                          }}
                          key={`${selectedTemplate}-${i}`}
                        />
                        <button
                          className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-full"
                          onClick={(e) => {
                            e.preventDefault();
                            uploadInputRefs.current[i]?.click();
                          }}
                        >
                          <UploadIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <label className="absolute inset-0 bg-gray-700 text-gray-400 flex items-center justify-center cursor-pointer hover:bg-gray-600 transition z-10">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) =>
                          handleVideoChange(i, e.target.files?.[0] || null)
                        }
                        className="hidden"
                        key={`${selectedTemplate}-${i}`}
                      />
                      <span className="text-sm flex items-center">
                        <Clock className="w-4 h-4 mr-1" /> Upload video
                      </span>
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scale Controls */}
      {activeVideoIndex !== null && videoClips[activeVideoIndex]?.file && (
        <div className="mb-6">
          <h3 className="text-gray-300 mb-2 font-medium">
            Video Position & Scale
          </h3>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1">Scale</label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={videoClips[activeVideoIndex].scale || 1}
                  onChange={(e) =>
                    handleVideoScale(
                      activeVideoIndex,
                      parseFloat(e.target.value)
                    )
                  }
                  className="flex-1 mr-3"
                />
                <div className="w-16 bg-gray-700 p-2 text-center rounded">
                  {((videoClips[activeVideoIndex].scale || 1) * 100).toFixed(0)}
                  %
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-300 mb-2">Position</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    X Position
                  </label>
                  <input
                    type="number"
                    value={videoClips[activeVideoIndex].positionX || 0}
                    onChange={(e) => {
                      setVideoClips((prevClips: VideoClip[]) => {
                        const newClips = [...prevClips];
                        newClips[activeVideoIndex] = {
                          ...newClips[activeVideoIndex],
                          positionX: parseFloat(e.target.value),
                        };
                        return newClips;
                      });
                    }}
                    className="w-full bg-gray-700 p-2 rounded text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Y Position
                  </label>
                  <input
                    type="number"
                    value={videoClips[activeVideoIndex].positionY || 0}
                    onChange={(e) => {
                      setVideoClips((prevClips: VideoClip[]) => {
                        const newClips = [...prevClips];
                        newClips[activeVideoIndex] = {
                          ...newClips[activeVideoIndex],
                          positionY: parseFloat(e.target.value),
                        };
                        return newClips;
                      });
                    }}
                    className="w-full bg-gray-700 p-2 rounded text-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* <button
              className="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-gray-300"
              onClick={() => {
                setVideoClips((prevClips) => {
                  const newClips = [...prevClips];
                  newClips[activeVideoIndex] = {
                    ...newClips[activeVideoIndex],
                    scale: 1,
                    positionX: 0,
                    positionY: 0,
                  };
                  return newClips;
                });
              }}
            >
              Reset Position & Scale
            </button> */}
          </div>
        </div>
      )}

      {/* Output Dimensions Display */}
      <div id="output-dimensions" className="mb-6">
        <h3 className="text-gray-300 mb-2 font-medium">Output Dimensions</h3>
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 text-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Width</p>
              <p className="text-lg font-semibold">
                {Math.round(getAspectRatioSize(selectedTemplate).width)}px
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Height</p>
              <p className="text-lg font-semibold">
                {Math.round(getAspectRatioSize(selectedTemplate).height)}px
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GifMakerVideoCropper;
