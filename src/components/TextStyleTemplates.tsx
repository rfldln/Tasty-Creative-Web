import React, { useState, useEffect } from "react";
import { FileImage, AlertCircle, Loader2 } from "lucide-react";

interface DriveFile {
  id: string;
  mimeType: string;
  name: string;
  thumbnailLink: string;
  webViewLink: string;
}

const TextStyleTemplates = ({
  setSelectedTextStyle,
}: {
  setSelectedTextStyle: (textStyleName: string) => void;
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  async function fetchFiles() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/google-drive/text-styles`);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();

      const cleanedFiles = data.files.map((file: { name: string }) => ({
        ...file,
        name: file.name.replace(/\.png$/i, ""),
      }));

      setFiles(cleanedFiles);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleImageError = (fileId: string) => {
    setImageErrors((prev) => new Set([...prev, fileId]));
  };

  const handleImageLoad = (fileId: string) => {
    setImageErrors((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  };

  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

  const handleFileSelect = (file: DriveFile) => {
    setSelectedFile(file);
    setSelectedTextStyle(file.name);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64  rounded-lg">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading text style templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-700 mb-4">Failed to load templates</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchFiles}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64  rounded-lg">
        <div className="text-center">
          <FileImage className="w-8 h-8 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No text style templates found</p>
        </div>
      </div>
    );
  }

  return (
    <div className=" text-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold  mb-2">Text Style Templates</h2>
        <p className="text-gray-600">
          Browse and select from available design templates
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto border border-gray-700 rounded-lg">
        <div className="grid grid-cols-2 gap-3 p-3">
          {files.map((file) => (
            <div
              key={file.id}
              className={`flex flex-col items-center p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                selectedFile?.id === file.id
                  ? "bg-gray-700 border-gray-200 shadow-sm"
                  : " border-gray-100 hover: hover:border-gray-200"
              }`}
              onClick={() => handleFileSelect(file)}
            >
              {/* Centered Image Preview */}
              <div className="w-20 h-12  rounded flex-shrink-0 relative overflow-hidden  mb-3">
                {imageErrors.has(file.id) ? (
                  <div className="w-full h-full flex items-center justify-center ">
                    <FileImage className="w-6 h-6 text-gray-400" />
                  </div>
                ) : (
                  <img
                    src={`/api/image-proxy?id=${file.id}`}
                    alt={`Preview of ${file.name}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                )}
              </div>

              {/* Centered File Name */}
              <div className="text-center">
                <p className="text-sm font-medium text-gray-200">{file.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Template Info */}
      {selectedFile && (
        <div className="mt-4 p-4 bg-gray-700 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-white mb-2">Selected Template</h3>
          <div className="flex items-center gap-4">
            <div className="w-20 h-12  rounded overflow-hidden flex-shrink-0">
              {imageErrors.has(selectedFile.id) ? (
                <div className="w-full h-full flex items-center justify-center">
                  <FileImage className="w-6 h-6 text-white" />
                </div>
              ) : (
                <img
                  src={`/api/image-proxy?id=${selectedFile.id}`}
                  alt={`Preview of ${selectedFile.name}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {selectedFile.name}
              </p>
              <p className="text-xs text-white">Text Style Template</p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button
      <div className="mt-8 text-center">
        <button
          onClick={fetchFiles}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Loading...
            </>
          ) : (
            "Refresh Templates"
          )}
        </button>
      </div> */}
    </div>
  );
};

export default TextStyleTemplates;
