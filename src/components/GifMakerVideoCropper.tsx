import { Clock, UploadIcon } from "lucide-react";
import { useRef, useEffect } from "react";
import { useDrag } from "react-use-gesture";

// First, let's update the VideoClip type to support multiple video files
type VideoClip = {
  files: {
    file: File | null;
    startTime: number;
    endTime: number;
    duration: number;
    scale?: number;
    positionX?: number;
    positionY?: number;
  }[];
  currentFileIndex: number;
};

type Template = {
  cols: number;
  rows: number;
  icon: React.ReactNode;
  name: string;
};

type Templates = {
  [key: string]: Template;
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
};

// Then modify the GifMakerVideoCropper component to handle multiple files per clip
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

  // Add video to sequence
  const addVideoToSequence = (cellIndex: number, file: File | null) => {
    if (!file) return;

    setVideoClips((prevClips: VideoClip[]) => {
      const newClips = [...prevClips];
      const newVideoData = {
        file,
        startTime: 0,
        endTime: 5,
        duration: 0,
        scale: newClips[cellIndex].files[0]?.scale || 1,
        positionX: newClips[cellIndex].files[0]?.positionX || 0,
        positionY: newClips[cellIndex].files[0]?.positionY || 0,
      };

      newClips[cellIndex].files.push(newVideoData);
      return newClips;
    });
  };

  // Remove video from sequence
  const removeVideoFromSequence = (cellIndex: number, fileIndex: number) => {
    setVideoClips((prevClips: VideoClip[]) => {
      const newClips = [...prevClips];
      // Don't remove if it's the only video
      if (newClips[cellIndex].files.length <= 1) return newClips;

      // If removing active file, set currentFileIndex to previous one
      if (fileIndex === newClips[cellIndex].currentFileIndex) {
        newClips[cellIndex].currentFileIndex = Math.max(0, fileIndex - 1);
      } else if (fileIndex < newClips[cellIndex].currentFileIndex) {
        // Adjust currentFileIndex if removing a file before it
        newClips[cellIndex].currentFileIndex--;
      }

      // Remove the file
      newClips[cellIndex].files.splice(fileIndex, 1);
      return newClips;
    });
  };

  // Switch to a specific video in the sequence
  const switchToVideoInSequence = (cellIndex: number, fileIndex: number) => {
    setVideoClips((prevClips: VideoClip[]) => {
      const newClips = [...prevClips];
      newClips[cellIndex].currentFileIndex = fileIndex;
      return newClips;
    });

    // Reset the video element to play the new file
    const videoElement = videoRefs.current[cellIndex];
    if (videoElement) {
      videoElement.currentTime =
        videoClips[cellIndex].files[fileIndex].startTime;
      videoElement.play().catch(() => {});
    }
  };

  // Calculate aspect ratio dimensions (unchanged)
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
      const currentFileIndex = newClips[index].currentFileIndex;
      newClips[index].files[currentFileIndex] = {
        ...newClips[index].files[currentFileIndex],
        scale: Math.max(0.1, Math.min(3, newScale)),
      };
      return newClips;
    });
  };

  // Update drag functionality for multiple files
  const bind = useDrag(({ movement: [mx, my], down }) => {
    if (activeVideoIndex === null || !dragTargetRef.current) return;

    const currentFileIndex = videoClips[activeVideoIndex].currentFileIndex;
    const currentFile = videoClips[activeVideoIndex].files[currentFileIndex];
    const baseX = currentFile?.positionX || 0;
    const baseY = currentFile?.positionY || 0;

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
        const fileIndex = newClips[activeVideoIndex].currentFileIndex;
        newClips[activeVideoIndex].files[fileIndex] = {
          ...newClips[activeVideoIndex].files[fileIndex],
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

  // Video overlay with optimized drag handling
  const renderVideoOverlay = (index: number) => {
    if (
      videoClips[index].files.length === 0 ||
      !videoClips[index].files[0]?.file
    )
      return null;

    return (
      <div
        className="absolute inset-0 z-10 cursor-move"
        onMouseDown={() => setActiveVideoIndex(index)}
      />
    );
  };

  // Handle playback of sequences
  const setupVideoSequencePlayback = (
    videoElement: HTMLVideoElement,
    cellIndex: number
  ) => {
    if (!videoElement) return;

    // Handle playback of sequence
    const handleSequencePlayback = () => {
      const clip = videoClips[cellIndex];
      const currentFileData = clip.files[clip.currentFileIndex];

      // Check if current video has reached its end time
      if (videoElement.currentTime >= currentFileData.endTime) {
        // Check if there's a next video in the sequence
        if (clip.currentFileIndex < clip.files.length - 1) {
          // Move to next video
          switchToVideoInSequence(cellIndex, clip.currentFileIndex + 1);
        } else {
          // Loop back to first video
          switchToVideoInSequence(cellIndex, 0);
        }
      }

      requestAnimationFrame(handleSequencePlayback);
    };

    // Start the playback handler
    requestAnimationFrame(handleSequencePlayback);
  };

  return (
    <>
      {/* Template Selection Section (unchanged) */}
      <h2 className="text-xl font-semibold text-blue-300">GIF Template</h2>
      <p className="text-gray-300 mb-4">Choose a template for your GIF.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {Object.keys(templates).map((key) => (
          <button
            key={key}
            onClick={() => {
              videoClips.forEach((clip) => {
                clip.files.forEach((fileData) => {
                  if (fileData.file)
                    URL.revokeObjectURL(URL.createObjectURL(fileData.file));
                });
              });

              setSelectedTemplate(key);
              setVideoClips(
                Array(templates[key].cols * templates[key].rows)
                  .fill(null)
                  .map(() => ({
                    files: [
                      {
                        file: null,
                        startTime: 0,
                        endTime: 5,
                        duration: 0,
                        scale: 1,
                        positionX: 0,
                        positionY: 0,
                      },
                    ],
                    currentFileIndex: 0,
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
                  {videoClips[i].files[0]?.file ? (
                    <>
                      <div
                        ref={i === activeVideoIndex ? dragTargetRef : null}
                        {...(i === activeVideoIndex ? bind() : {})}
                        className="w-full h-full relative overflow-hidden"
                        style={{
                          transform: `translate(var(--translate-x, ${
                            videoClips[i].files[videoClips[i].currentFileIndex]
                              .positionX || 0
                          }px), var(--translate-y, ${
                            videoClips[i].files[videoClips[i].currentFileIndex]
                              .positionY || 0
                          }px)) scale(var(--scale, ${
                            videoClips[i].files[videoClips[i].currentFileIndex]
                              .scale || 1
                          }))`,
                          transformOrigin: "center",
                          willChange: "transform",
                        }}
                        onWheel={(e) => {
                          if (activeVideoIndex !== i) return;
                          e.preventDefault();
                          const delta = e.deltaY * -0.01;
                          const currentScale =
                            videoClips[i].files[videoClips[i].currentFileIndex]
                              .scale || 1;
                          handleVideoScale(i, currentScale + delta);
                        }}
                      >
                        <video
                          ref={(el) => {
                            const currentFileData =
                              videoClips[i].files[
                                videoClips[i].currentFileIndex
                              ];
                            if (!el || !currentFileData?.file) return;

                            videoRefs.current[i] = el;

                            // Only set up event listener if there is more than 1 file
                            if (videoClips[i].files.length > 1) {
                              // Avoid attaching multiple listeners
                              if (!el.dataset.listenerAttached) {
                                el.dataset.listenerAttached = "true";

                                el.addEventListener("loadeddata", () => {
                                  el.currentTime = currentFileData.startTime;
                                  el.play().catch(() => {});
                                  setupVideoSequencePlayback(el, i);
                                });
                              }
                            } else {
                              // For single videos, just set startTime and play (optional)
                              el.currentTime = currentFileData.startTime;
                              el.play().catch(() => {});
                            }
                          }}
                          src={
                            videoClips[i].files[videoClips[i].currentFileIndex]
                              .file !== null
                              ? URL.createObjectURL(
                                  videoClips[i].files[
                                    videoClips[i].currentFileIndex
                                  ].file as File
                                )
                              : ""
                          }
                          className="absolute inset-0 w-full h-full object-contain"
                          muted
                          playsInline
                          loop={videoClips[i].files.length === 1}
                          autoPlay
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
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (file) {
                              // Add to the sequence instead of replacing
                              addVideoToSequence(i, file);
                            }
                          }}
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
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) {
                            handleVideoChange(i, file);
                          }
                        }}
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

      {/* Video Sequence Manager - New Section */}
      {activeVideoIndex !== null &&
        videoClips[activeVideoIndex].files[0]?.file && (
          <div className="mb-6">
            <h3 className="text-gray-300 mb-2 font-medium">Video Sequence</h3>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <div className="mb-4">
                <p className="text-sm text-gray-300 mb-2">
                  Videos in this cell (
                  {videoClips[activeVideoIndex].files.length})
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto p-2">
                  {videoClips[activeVideoIndex].files.map(
                    (fileData, fileIndex) => (
                      <div
                        key={fileIndex}
                        className={`flex items-center justify-between p-2 rounded ${
                          fileIndex ===
                          videoClips[activeVideoIndex].currentFileIndex
                            ? "bg-blue-900 border border-blue-500"
                            : "bg-gray-800"
                        }`}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="w-8 h-8 bg-gray-700 flex items-center justify-center rounded mr-2">
                            {fileIndex + 1}
                          </div>
                          <div className="truncate flex-1">
                            <p className="text-xs text-gray-300 truncate">
                              {fileData.file?.name || "Unnamed"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {fileData.startTime.toFixed(1)}s -{" "}
                              {fileData.endTime.toFixed(1)}s
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            className="bg-blue-600 hover:bg-blue-500 text-white p-1 rounded text-xs"
                            onClick={() =>
                              switchToVideoInSequence(
                                activeVideoIndex,
                                fileIndex
                              )
                            }
                          >
                            Play
                          </button>

                          {videoClips[activeVideoIndex].files.length > 1 && (
                            <button
                              className="bg-red-600 hover:bg-red-500 text-white p-1 rounded text-xs"
                              onClick={() =>
                                removeVideoFromSequence(
                                  activeVideoIndex,
                                  fileIndex
                                )
                              }
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="mt-4 flex justify-between">
                  <button
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
                    onClick={() => {
                      uploadInputRefs.current[activeVideoIndex]?.click();
                    }}
                  >
                    Add Video to Sequence
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Scale Controls */}
      {activeVideoIndex !== null &&
        videoClips[activeVideoIndex].files[0]?.file && (
          <div className="mb-6">
            <h3 className="text-gray-300 mb-2 font-medium">
              Video Position & Scale
            </h3>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-1">
                  Scale
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.05"
                    value={
                      videoClips[activeVideoIndex].files[
                        videoClips[activeVideoIndex].currentFileIndex
                      ].scale || 1
                    }
                    onChange={(e) =>
                      handleVideoScale(
                        activeVideoIndex,
                        parseFloat(e.target.value)
                      )
                    }
                    className="flex-1 mr-3"
                  />
                  <div className="w-16 bg-gray-700 p-2 text-center rounded">
                    {(
                      (videoClips[activeVideoIndex].files[
                        videoClips[activeVideoIndex].currentFileIndex
                      ].scale || 1) * 100
                    ).toFixed(0)}
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
                      value={
                        videoClips[activeVideoIndex].files[
                          videoClips[activeVideoIndex].currentFileIndex
                        ].positionX || 0
                      }
                      onChange={(e) => {
                        setVideoClips((prevClips: VideoClip[]) => {
                          const newClips = [...prevClips];
                          const fileIndex =
                            newClips[activeVideoIndex].currentFileIndex;
                          newClips[activeVideoIndex].files[fileIndex] = {
                            ...newClips[activeVideoIndex].files[fileIndex],
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
                      value={
                        videoClips[activeVideoIndex].files[
                          videoClips[activeVideoIndex].currentFileIndex
                        ].positionY || 0
                      }
                      onChange={(e) => {
                        setVideoClips((prevClips: VideoClip[]) => {
                          const newClips = [...prevClips];
                          const fileIndex =
                            newClips[activeVideoIndex].currentFileIndex;
                          newClips[activeVideoIndex].files[fileIndex] = {
                            ...newClips[activeVideoIndex].files[fileIndex],
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
            </div>
          </div>
        )}

      {/* Output Dimensions Display (unchanged) */}
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
