/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";



export default function FlyerTemplates({
  flyer,
  type,
  setSelectedTemplate,
  setSelectedTemplateImage,
}: {
  flyer: string;
  type: string;
  setSelectedTemplate: (template: string) => void;
  setSelectedTemplateImage: (templateImage: string) => void;
}) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFiles, setShowFiles] = useState(false);
  const [isDownloading, startDownloadTransition] = useTransition();

  async function fetchFiles() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/google-drive/flyer-templates?type=${type}`);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setFiles(data.files);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/google-drive/flyer-templates?flyer=${flyer}&type=${type}`
        );
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setFiles(data.files);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (type != "LIVE") {
      fetchFiles();
    }
  }, [type]);

  const handleViewTemplates = () => {
    setShowFiles(true);
    if (files.length === 0) {
      fetchFiles();
    }
    // Prevent body scrolling when overlay is active
    document.body.style.overflow = "hidden";
  };

  const handleClose = () => {
    setShowFiles(false);
    // Restore body scrolling
    document.body.style.overflow = "auto";
  };

  const handleThumbnailClick = async (file: GoogleDriveFile) => {
    try {
      startDownloadTransition(async () => {
        const response = await fetch(
          `/api/google-drive/download?id=${file.id}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch file");
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        setSelectedTemplateImage(imageUrl);
        setSelectedTemplate(file.name);
        handleClose();
      });
    } catch (error) {
      console.error("Failed to fetch thumbnail:", error);
      alert("Could not load the selected thumbnail.");
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div>
      <button
        type="button"
        onClick={handleViewTemplates}
        className="bg-black/60 text-white px-6 py-2 rounded-lg font-medium w-full flex items-center justify-center gap-2"
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
        Select Templates (optional)
      </button>

      {isDownloading && (
        <div className="fixed inset-0 w-full min-h-screen flex flex-col items-center justify-center bg-black/90 overflow-hidden z-52">
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
          <span className="text-sm text-gray-500">Downloading File...</span>
        </div>
      )}

      {showFiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 overflow-y-auto">
          <div className="w-full h-full max-w-7xl p-4 md:p-6">
            <div className="bg-black/60 text-white rounded-xl shadow-2xl border border-gray-700 p-6 max-h-full overflow-auto">
              {/* Header */}
              <div className="flex justify-between items-center mb-8 sticky top-0 bg-black/80 backdrop-blur-sm py-4 -mt-6 -mx-6 px-6">
                <h2 className="text-2xl font-bold text-white">
                  {flyer} Templates
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="bg-transparent hover:bg-gray-800 rounded-full p-2"
                  aria-label="Close"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Loading state */}
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-pulse text-gray-400">
                    Loading Google Drive templates...
                  </div>
                </div>
              ) : error ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-red-400">Error: {error}</p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {files.map((file) => (
                    <li
                      key={file.id}
                      className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/40 hover:bg-gray-800/80 transition-all group"
                    >
                      {file.thumbnailLink ? (
                        <div
                          className="cursor-pointer relative w-full aspect-[1350/1080] overflow-hidden group"
                          onClick={() => handleThumbnailClick(file)}
                        >
                          <Image
                            src={file.thumbnailLink}
                            alt={`Thumbnail of ${file.name}`}
                            className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 bg-black"
                            fill
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                            <span className="text-xs text-white font-medium bg-black/50 px-2 py-1 rounded">
                              Click to select
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-40 bg-gray-800 text-gray-400 flex items-center justify-center">
                          No thumbnail
                        </div>
                      )}
                      <div className="p-3">
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-200 hover:text-blue-400 block text-center font-medium truncate"
                          title={file.name}
                        >
                          {file.name}
                        </a>
                        <p className="text-xs text-center text-gray-500 mt-1">
                          {file.mimeType.replace("application/", "")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Empty state */}
              {!loading && !error && files.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <p>No templates found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
