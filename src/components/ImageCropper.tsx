/* eslint-disable @next/next/no-img-element */
"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useTransition,
} from "react";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface GoogleDriveFile {
  id: string;
  name: string;
  thumbnailLink?: string;
  isFolder: boolean;
}

interface ImageCropperProps {
  onCropComplete: (croppedImage: string) => void;
  aspectRatio?: number;
  model?: string;
}

export default function ImageCropper({
  onCropComplete,
  aspectRatio = 4 / 5, // 1080:1350 ratio (width:height)
  model,
}: ImageCropperProps) {
  // Image cropping states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Google Drive states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [googleFiles, setGoogleFiles] = useState<GoogleDriveFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<GoogleDriveFile | null>(
    null
  );
  const [parentFolder, setParentFolder] = useState<GoogleDriveFile | null>(
    null
  );
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [isGooglePickerLoading, setIsGooglePickerLoading] = useState(false);
  const [isDownloading, startDownloadTransition] = useTransition();
  const [isListing, startListTransition] = useTransition();

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/google-drive/list");
      if (response.ok) {
        setIsAuthenticated(true);
        const data = await response.json();
        if (data.files) {
          setGoogleFiles(data.files);
          setCurrentFolder(data.currentFolder || null);
          setParentFolder(data.parentFolder || null);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
    }
  };

  const handleGoogleDriveAuth = async () => {
    try {
      const response = await fetch("/api/google-drive/auth");
      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error starting Google authentication:", error);
      alert("Failed to connect to Google Drive");
    }
  };

  const handleGoogleDriveSelect = async () => {
    if (!isAuthenticated) {
      handleGoogleDriveAuth();
      return;
    }

    try {
      startListTransition(async () => {
        setIsGooglePickerLoading(true);
        // If a model is selected, try to find its folder
        let url = "/api/google-drive/list";
        if (model) {
          url += `?folderName=${model}`;
        }

        const response = await fetch(url);

        // if (!response.ok) {
        //   if (response.status === 401) {
        //     setIsAuthenticated(false);
        //     handleGoogleDriveAuth();
        //     return;
        //   }
        //   throw new Error("Failed to fetch Google Drive files");
        // }

        const data = await response.json();

        if (data.files) {
          setGoogleFiles(data.files);
          setCurrentFolder(data.currentFolder || null);
          setParentFolder(data.parentFolder || null);
          setShowFilePicker(true);
        } else {
          alert("No images found in the selected folder");
        }
      });
    } catch (error) {
      console.error("Error selecting from Google Drive:", error);
      alert("Failed to connect to Google Drive");
    } finally {
      setIsGooglePickerLoading(false);
    }
  };

  const handleOpenFolder = async (folder: GoogleDriveFile) => {
    try {
      setIsGooglePickerLoading(true);
      const response = await fetch(
        `/api/google-drive/list?folderId=${folder.id}`
      );

      if (!response.ok) {
        throw new Error("Failed to open folder");
      }

      const data = await response.json();
      setGoogleFiles(data.files);
      setCurrentFolder(data.currentFolder || null);
      setParentFolder(data.parentFolder || null);
    } catch (error) {
      console.error("Error opening folder:", error);
      alert("Failed to open folder");
    } finally {
      setIsGooglePickerLoading(false);
    }
  };

  const handleNavigateUp = async () => {
    if (parentFolder) {
      try {
        setIsGooglePickerLoading(true);
        const response = await fetch(
          `/api/google-drive/list?folderId=${parentFolder.id}`
        );

        if (!response.ok) {
          throw new Error("Failed to navigate up");
        }

        const data = await response.json();
        setGoogleFiles(data.files);
        setCurrentFolder(data.currentFolder || null);
        setParentFolder(data.parentFolder || null);
      } catch (error) {
        console.error("Error navigating up:", error);
        alert("Failed to navigate up");
      } finally {
        setIsGooglePickerLoading(false);
      }
    }
  };

  const handleFileSelected = async (file: GoogleDriveFile) => {
    if (file.isFolder) {
      handleOpenFolder(file);
      return;
    }

    try {
      // Fetch the image file from Google Drive
      startDownloadTransition(async () => {
        const response = await fetch(
          `/api/google-drive/download?id=${file.id}`
        );
        if (!response.ok) {
          throw new Error("Failed to download image");
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        setSelectedImage(imageUrl);
        setCrop(undefined); // Reset crop when new image is loaded
        setShowFilePicker(false);
      });
    } catch (error) {
      console.error("Error loading image:", error);
      alert("Failed to load selected image");
    }
  };

  // Function to center and create aspect ratio crop
  function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number
  ) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setImageSize({ width, height });

    // Initialize with a centered crop of the correct aspect ratio
    setCrop(centerAspectCrop(width, height, aspectRatio));
  };

  // const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files.length > 0) {
  //     const reader = new FileReader();
  //     reader.addEventListener("load", () => {
  //       setSelectedImage(reader.result as string);
  //       // Reset crop when new image is loaded
  //       setCrop(undefined);
  //     });
  //     reader.readAsDataURL(e.target.files[0]);
  //   }
  // };

  const generateCroppedImage = useCallback(() => {
    if (!completedCrop || !imageRef.current) return;

    const image = imageRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // For output size, we'll scale to exactly 1080x1350
    const outputWidth = 1080;
    const outputHeight = 1350;

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw the cropped portion of the image, scaled to our desired output size
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      outputWidth,
      outputHeight
    );

    const croppedImageUrl = canvas.toDataURL("image/jpeg", 0.92); // Higher quality JPEG
    onCropComplete(croppedImageUrl);
  }, [completedCrop, onCropComplete]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          disabled={!model}
          onClick={handleGoogleDriveSelect}
          className="px-4 w-full py-2 bg-black/60 text-white rounded-lg
            flex items-center justify-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
            <line x1="16" y1="5" x2="22" y2="5"></line>
            <line x1="16" y1="5" x2="12" y2="9"></line>
          </svg>
          {isAuthenticated && !isListing
            ? model
              ? `Select from ${model} folder`
              : "Select a Model First"
            : isListing
            ? "Opening folder..."
            : "Connecting to Google Drive"}
        </button>
      </div>

      {selectedImage && (
        <div className="flex flex-col w-full items-center gap-4">
          <p className="text-xs text-gray-300">
            Crop area will maintain a 4:5 ratio (1080x1350px)
          </p>

          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              minWidth={100} // Prevent tiny crops
            >
              <img
                ref={imageRef}
                src={selectedImage ?? ""}
                alt="Selected"
                className="max-h-96 max-w-full"
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>

          <div className="flex w-full items-center gap-4">
            <button
              type="button"
              onClick={generateCroppedImage}
              className="px-4 py-2  bg-purple-500 text-white rounded-md hover:bg-blue-700"
              disabled={!completedCrop}
            >
              Apply Crop
            </button>

            <div className="text-sm text-gray-300">
              {imageSize.width > 0 && (
                <span>Selected area will be exported at 1080×1350px</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Google Drive File Picker Modal */}
      {showFilePicker && (
        <div className="fixed inset-0 px-4 lg:px-20 bg-black/60 flex items-center justify-center z-50">
          <div
            className={cn(
              "bg-black/80 rounded-lg px-6 pb-6 w-full max-h-[80vh] overflow-auto relative",
              { "overflow-hidden": isDownloading }
            )}
          >
            {isDownloading && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black/90 absolute overflow-hidden">
                <svg
                  className="animate-spin h-8 w-8 text-purple-500 mb-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="text-sm text-gray-500">
                  Downloading Image...
                </span>
              </div>
            )}
            <div className="sticky top-0 pt-2 py-0.5 bg-black/60">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">
                  {currentFolder
                    ? `Folder: ${currentFolder.name}`
                    : "Select an image"}
                </h3>
                <button
                  onClick={() => setShowFilePicker(false)}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Folder navigation */}
              {parentFolder && (
                <div className="mb-4 w-full h-full">
                  <button
                    onClick={handleNavigateUp}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1"
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back to {parentFolder.name}
                  </button>
                </div>
              )}
            </div>

            {isGooglePickerLoading ? (
              <div className="flex justify-center items-center py-8 h-full w-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {googleFiles.length > 0 ? (
                  googleFiles.map((file) => (
                    <div
                      key={file.id}
                      className="border rounded-md p-2 cursor-pointer hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600"
                      onClick={() => handleFileSelected(file)}
                    >
                      <div className="h-24 bg-gray-100 flex items-center justify-center mb-2 overflow-hidden">
                        {file.isFolder ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-amber-500"
                          >
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                          </svg>
                        ) : file.thumbnailLink ? (
                          <Image
                            src={file.thumbnailLink}
                            width={200}
                            height={200}
                            alt={file.name}
                            className="max-h-full object-contain"
                            loading="lazy"
                            unoptimized
                          />
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-gray-300"
                          >
                            <rect
                              x="3"
                              y="3"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                            ></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                        )}
                      </div>
                      <p className="text-xs truncate">
                        {file.isFolder ? `📁 ${file.name}` : file.name}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center col-span-full w-full text-gray-500">
                    No files found in this folder
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
