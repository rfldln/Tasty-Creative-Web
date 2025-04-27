/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type GoogleDriveFilePickerProps = {
  id?: string;
  model: string;
  setSelectedImage: (selectedImage: any) => void;
  setCrop: (crop: any) => void;
  setVideoUrl: (videoUrl: any) => void;
};

const GoogleDrivePicker = ({
  id,
  model,
  setSelectedImage,
  setCrop,
  setVideoUrl,
}: GoogleDriveFilePickerProps) => {
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
  const [isListing, startListTransition] = useTransition();
  const [isDownloading, startDownloadTransition] = useTransition();
  const includeVideos = true;
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const url = "/api/google-drive/list";

      const response = await fetch(url);
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

  const handleGoogleDriveSelect = async () => {
    try {
      startListTransition(async () => {
        setIsGooglePickerLoading(true);

        try {
          // Step 1: Start from root or model folder
          let url = "/api/google-drive/list";
          if (model) {
            url += `?folderName=${model}`;
          }

          const response = await fetch(url);
          const initialData = await response.json();

          if (id !== "default") {
            // Step 2: If not default, get parent of the found folder
            const parentId = initialData.parentFolder.id;

            if (!parentId) {
              throw new Error("Parent folder not found");
            }

            let url = `/api/google-drive/list?folderId=${parentId}`;
            if (includeVideos) {
              url += `&includeVideos=${includeVideos}`;
            }

            const parentResponse = await fetch(url);
            if (!parentResponse.ok) {
              throw new Error("Failed to fetch parent folder files");
            }

            const parentData = await parentResponse.json();

            setGoogleFiles(parentData.files);
            setCurrentFolder(parentData.currentFolder || null);
            setParentFolder(parentData.parentFolder || null);
            setShowFilePicker(true);
          } else {
            // Default view
            if (initialData.files) {
              setGoogleFiles(initialData.files);
              setCurrentFolder(initialData.currentFolder || null);
              setParentFolder(initialData.parentFolder || null);
              setShowFilePicker(true);
            } else {
              alert("No images found in the selected folder");
            }
          }
        } catch (error) {
          console.error("Error fetching drive files:", error);
          alert("Failed to load Google Drive files");
        } finally {
          setIsGooglePickerLoading(false);
        }
      });
    } catch (error) {
      console.error("Error selecting from Google Drive:", error);
      alert("Failed to connect to Google Drive");
    } finally {
      setIsGooglePickerLoading(false);
    }
  };

  const handleFileSelected = async (file: GoogleDriveFile) => {
    debugger;
    if (file.isFolder) {
      handleOpenFolder(file);
      return;
    }

    try {
      startDownloadTransition(async () => {
        const response = await fetch(
          `/api/google-drive/download?id=${file.id}`
        );
        if (!response.ok) {
          throw new Error("Failed to download video");
        }

        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);

        // For videos, handle it differently
        setVideoUrl(videoUrl);
        // Set this to a state where you manage video sources
        setShowFilePicker(false); // Hide file picker after selection
        setCrop(false);
      });
    } catch (error) {
      console.error("Error loading video:", error);
      alert("Failed to load selected video");
    }
  };

  const handleOpenFolder = async (folder: GoogleDriveFile) => {
    try {
      setIsGooglePickerLoading(true);

      let url = `/api/google-drive/list?folderId=${folder.id}`;
      if (includeVideos) {
        url += `&includeVideos=${includeVideos}`;
      }

      const response = await fetch(url);

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

        let url = `/api/google-drive/list?folderId=${parentFolder.id}`;
        if (includeVideos) {
          url += `&includeVideos=${includeVideos}`;
        }
        const response = await fetch(url);

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

  return (
    <>
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
      {showFilePicker && (
        <div className="fixed inset-0 px-4 lg:px-20 bg-black/60 flex items-center justify-center z-50">
          <div
            className={cn(
              "bg-black/80 rounded-lg px-6 pb-6 w-full max-h-[80vh] overflow-auto relative",
              { "overflow-hidden": isDownloading }
            )}
          >
            {isDownloading && (
              <div className="fixed inset-0 w-full min-h-screen flex flex-col items-center justify-center bg-black/90 overflow-hidden z-2">
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
                  Downloading File...
                </span>
              </div>
            )}
            <div className="sticky top-0 pt-2 py-0.5 bg-black/60 z-50">
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
    </>
  );
};

export default GoogleDrivePicker;
