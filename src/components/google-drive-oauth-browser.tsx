"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Search,
  Filter,
  Grid,
  List,
  FolderOpen,
  FileImage,
  Plus,
  Check,
  RefreshCw,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Folder,
  Image,
  ExternalLink,
  LogIn,
  LogOut,
  User,
} from "lucide-react";

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
const REDIRECT_URI =
  typeof window !== "undefined"
    ? window.location.origin + "/api/auth/google/callback"
    : "";

// Scopes needed for Drive access
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// Your restricted folder ID
const RESTRICTED_FOLDER_ID = "14RIKXBRZzHPMpNNsnfmOPRh2hMlS54YH";

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink: string;
  webContentLink?: string;
  size?: string;
  modifiedTime: string;
  isFolder: boolean;
}

interface DatasetItem {
  id: string;
  imageUrl: string;
  filename: string;
  tags: string[];
  category: string;
  description?: string;
  source: "generated" | "imported" | "drive";
  dateAdded: Date;
  driveFileId?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  userInfo: {
    email?: string;
    name?: string;
    picture?: string;
  } | null;
}

interface BrowseTabProps {
  datasetItems: DatasetItem[];
  setDatasetItems: React.Dispatch<React.SetStateAction<DatasetItem[]>>;
  onClose?: () => void;
}

const BrowseTab: React.FC<BrowseTabProps> = ({
  datasetItems,
  setDatasetItems,
  onClose,
}) => {
  // Auth state
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    userInfo: null,
  });

  // State management
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [currentFolder, setCurrentFolder] =
    useState<string>(RESTRICTED_FOLDER_ID);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>(
    []
  );

  // Google Drive state
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  // File type filters
  const fileTypes = ["all", "images", "folders"];

  // Supported image formats
  const supportedImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/svg+xml",
  ];

  // Initialize auth from localStorage
  useEffect(() => {
    const token = localStorage.getItem("google_access_token");
    const userInfo = localStorage.getItem("google_user_info");

    if (token) {
      setAuthState({
        isAuthenticated: true,
        accessToken: token,
        userInfo: userInfo ? JSON.parse(userInfo) : null,
      });
    }

    // Check for auth params in URL (after redirect from Google)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      handleAuthCallback(code);
    }
  }, []);

  // Handle OAuth login
  const handleLogin = () => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(
      {
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        scope: SCOPES,
        access_type: "offline",
        prompt: "consent",
      }
    )}`;

    window.location.href = authUrl;
  };

  // Handle OAuth callback
  const handleAuthCallback = async (code: string) => {
    try {
      // Exchange code for token
      const tokenResponse = await fetch("/api/auth/google/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
      });

      if (!tokenResponse.ok)
        throw new Error("Failed to exchange code for token");

      const tokenData = await tokenResponse.json();

      // Get user info
      const userResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );

      if (!userResponse.ok) throw new Error("Failed to get user info");

      const userInfo = await userResponse.json();

      // Store auth data
      localStorage.setItem("google_access_token", tokenData.access_token);
      localStorage.setItem("google_refresh_token", tokenData.refresh_token);
      localStorage.setItem("google_user_info", JSON.stringify(userInfo));

      setAuthState({
        isAuthenticated: true,
        accessToken: tokenData.access_token,
        userInfo,
      });

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      console.error("Auth callback error:", err);
      setError("Failed to authenticate. Please try again.");
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("google_refresh_token");
    localStorage.removeItem("google_user_info");

    setAuthState({
      isAuthenticated: false,
      accessToken: null,
      userInfo: null,
    });

    setDriveFiles([]);
  };

  // Load folder contents with authentication
  const loadFolderContents = async (
    folderId: string = RESTRICTED_FOLDER_ID,
    pageToken?: string
  ) => {
    if (!authState.isAuthenticated || !authState.accessToken) {
      setError("Please sign in to access Google Drive files");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        q: `'${folderId}' in parents and trashed=false`,
        fields:
          "nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink,webContentLink,size,modifiedTime)",
        pageSize: "100",
        orderBy: "name",
      });

      if (pageToken) {
        params.append("pageToken", pageToken);
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authState.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 401) {
          // Token expired, need to refresh
          handleLogout();
          throw new Error("Session expired. Please sign in again.");
        } else if (response.status === 403) {
          throw new Error("You don't have permission to access this folder.");
        } else {
          throw new Error(errorData.error?.message || "Failed to load folder");
        }
      }

      const data = await response.json();

      // Transform files
      const transformedFiles: GoogleDriveFile[] = (data.files || []).map(
        (file: any) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          thumbnailLink: file.thumbnailLink,
          webViewLink: file.webViewLink,
          webContentLink: file.webContentLink,
          size: file.size ? formatBytes(parseInt(file.size)) : undefined,
          modifiedTime: file.modifiedTime,
          isFolder: file.mimeType === "application/vnd.google-apps.folder",
        })
      );

      if (pageToken) {
        setDriveFiles((prev) => [...prev, ...transformedFiles]);
      } else {
        setDriveFiles(transformedFiles);
      }

      setNextPageToken(data.nextPageToken || null);
      setCurrentFolder(folderId);
    } catch (err: any) {
      console.error("Error loading folder:", err);
      setError(err.message || "Failed to load folder contents");
    } finally {
      setIsLoading(false);
    }
  };

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Load folder when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.accessToken) {
      loadFolderContents(RESTRICTED_FOLDER_ID);
    }
  }, [authState.isAuthenticated]);

  // Navigate to folder
  const navigateToFolder = async (folderId: string, folderName: string) => {
    setFolderPath((prev) => [...prev, { id: currentFolder, name: folderName }]);
    await loadFolderContents(folderId);
  };

  // Navigate back
  const navigateBack = async () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      const previousFolder = newPath.pop();
      setFolderPath(newPath);

      const targetId = previousFolder?.id || RESTRICTED_FOLDER_ID;
      await loadFolderContents(targetId);
    }
  };

  // Get authenticated image URL
  const getImageUrl = (file: GoogleDriveFile): string => {
    // For authenticated access, we need to use the webContentLink with the access token
    if (file.webContentLink && authState.accessToken) {
      return `${file.webContentLink}&access_token=${authState.accessToken}`;
    }

    if (file.thumbnailLink && authState.accessToken) {
      // Add access token to thumbnail link and increase size
      const url = new URL(file.thumbnailLink);
      url.searchParams.set("access_token", authState.accessToken);
      return url.toString().replace(/=s\d+/, "=s800");
    }

    return file.webViewLink;
  };

  // Add files to dataset
  const addFilesToDataset = async (fileIds: string[]) => {
    const filesToAdd = driveFiles.filter(
      (file) =>
        fileIds.includes(file.id) &&
        !file.isFolder &&
        supportedImageTypes.includes(file.mimeType)
    );

    const newDatasetItems: DatasetItem[] = filesToAdd.map((file) => ({
      id: `drive_${file.id}`,
      imageUrl: getImageUrl(file),
      filename: file.name,
      tags: extractTagsFromFilename(file.name),
      category: detectCategoryFromFilename(file.name),
      description: `Imported from Google Drive: ${file.name}`,
      source: "drive",
      dateAdded: new Date(),
      driveFileId: file.id,
    }));

    setDatasetItems((prev) => [...newDatasetItems, ...prev]);
    setSelectedFiles(new Set());
  };

  // Extract tags from filename
  const extractTagsFromFilename = (filename: string): string[] => {
    const tags: string[] = [];
    const name = filename.toLowerCase();

    if (name.includes("portrait")) tags.push("portrait");
    if (name.includes("landscape")) tags.push("landscape");
    if (name.includes("abstract")) tags.push("abstract");
    if (name.includes("anime")) tags.push("anime");
    if (name.includes("realistic")) tags.push("realistic");

    return tags;
  };

  // Detect category from filename
  const detectCategoryFromFilename = (filename: string): string => {
    const name = filename.toLowerCase();
    if (name.includes("portrait") || name.includes("face")) return "portraits";
    if (name.includes("landscape") || name.includes("scenery"))
      return "landscapes";
    if (name.includes("abstract")) return "abstract";
    if (name.includes("anime")) return "anime";
    return "objects";
  };

  // Filter files
  const filteredFiles = driveFiles.filter((file) => {
    const matchesSearch = file.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType =
      selectedFileType === "all" ||
      (selectedFileType === "images" &&
        !file.isFolder &&
        supportedImageTypes.includes(file.mimeType)) ||
      (selectedFileType === "folders" && file.isFolder);
    return matchesSearch && matchesType;
  });

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  // Handle select all
  const handleSelectAll = () => {
    const selectableFiles = filteredFiles.filter(
      (file) => !file.isFolder && supportedImageTypes.includes(file.mimeType)
    );

    if (selectedFiles.size === selectableFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(selectableFiles.map((file) => file.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Auth */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          Google Drive Browser
        </h2>

        {/* Auth Status */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          {authState.isAuthenticated && authState.userInfo ? (
            <div className="flex items-center space-x-3">
              {authState.userInfo.picture && (
                <img
                  src={authState.userInfo.picture}
                  alt={authState.userInfo.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div className="text-left">
                <p className="text-white text-sm font-medium">
                  {authState.userInfo.name}
                </p>
                <p className="text-gray-400 text-xs">
                  {authState.userInfo.email}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="bg-black/60 border-white/10 text-white"
              >
                <LogOut size={16} className="mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <LogIn size={16} className="mr-2" />
              Sign in with Google
            </Button>
          )}
        </div>

        {!authState.isAuthenticated && (
          <p className="text-gray-400 text-sm">
            Sign in to access restricted folders
          </p>
        )}
      </div>

      {authState.isAuthenticated && (
        <>
          {/* Folder Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {folderPath.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateBack}
                  disabled={isLoading}
                  className="bg-black/60 border-white/10 text-white"
                >
                  <ChevronLeft size={16} />
                </Button>
              )}

              <div className="flex items-center space-x-1 text-gray-300">
                <FolderOpen size={16} />
                <span>Root</span>
                {folderPath.map((folder, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight size={14} className="text-gray-500" />
                    <span>{folder.name}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFolderContents(currentFolder)}
              disabled={isLoading}
              className="bg-black/60 border-white/10 text-white"
            >
              <RefreshCw
                size={16}
                className={`mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <Input
                  placeholder="Search files and folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/60 border-white/10 text-white pl-10"
                />
              </div>
            </div>

            <Select
              value={selectedFileType}
              onValueChange={setSelectedFileType}
            >
              <SelectTrigger className="w-40 bg-black/60 border-white/10 text-white">
                <Filter size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/10 text-white">
                {fileTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="bg-black/60 border-white/10 text-white"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List size={16} /> : <Grid size={16} />}
            </Button>

            {selectedFiles.size > 0 && (
              <Button
                onClick={() => addFilesToDataset(Array.from(selectedFiles))}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus size={16} className="mr-2" />
                Add to Dataset ({selectedFiles.size})
              </Button>
            )}
          </div>

          {/* Bulk Selection */}
          {filteredFiles.some(
            (file) =>
              !file.isFolder && supportedImageTypes.includes(file.mimeType)
          ) && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="bg-black/60 border-white/10 text-white"
              >
                {selectedFiles.size ===
                filteredFiles.filter(
                  (f) => !f.isFolder && supportedImageTypes.includes(f.mimeType)
                ).length
                  ? "Deselect All"
                  : "Select All Images"}
              </Button>

              <span className="text-gray-400 text-sm">
                {
                  filteredFiles.filter(
                    (f) =>
                      !f.isFolder && supportedImageTypes.includes(f.mimeType)
                  ).length
                }{" "}
                images available
              </span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert
              variant="destructive"
              className="bg-red-900/20 border-red-500/30 text-red-200"
            >
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && driveFiles.length === 0 ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-400" />
              <p className="text-gray-300">Loading folder contents...</p>
            </div>
          ) : (
            /* Files Grid/List */
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                  : "space-y-2"
              }
            >
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`group relative bg-black/40 rounded-lg overflow-hidden border border-white/10 hover:border-purple-400/30 transition-all ${
                    selectedFiles.has(file.id) ? "ring-2 ring-purple-400" : ""
                  } ${
                    viewMode === "list" ? "flex items-center space-x-4 p-3" : ""
                  }`}
                >
                  {/* File Preview */}
                  <div
                    className={`relative ${
                      viewMode === "grid"
                        ? "aspect-square"
                        : "w-12 h-12 flex-shrink-0"
                    }`}
                  >
                    {file.isFolder ? (
                      <div
                        className="w-full h-full bg-blue-600/20 flex items-center justify-center cursor-pointer hover:bg-blue-600/30 transition-colors"
                        onClick={() => navigateToFolder(file.id, file.name)}
                      >
                        <Folder
                          className="text-blue-400"
                          size={viewMode === "grid" ? 48 : 24}
                        />
                      </div>
                    ) : file.thumbnailLink && authState.accessToken ? (
                      <img
                        src={`${file.thumbnailLink}&access_token=${authState.accessToken}`}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback if image fails to load
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove(
                            "hidden"
                          );
                        }}
                      />
                    ) : null}

                    {/* Fallback icon */}
                    <div
                      className={`w-full h-full bg-gray-600/20 flex items-center justify-center ${
                        file.thumbnailLink ? "hidden" : ""
                      }`}
                    >
                      <Image
                        className="text-gray-400"
                        size={viewMode === "grid" ? 32 : 20}
                      />
                    </div>

                    {/* Selection Checkbox */}
                    {!file.isFolder &&
                      supportedImageTypes.includes(file.mimeType) && (
                        <div className="absolute top-2 left-2">
                          <button
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                              selectedFiles.has(file.id)
                                ? "bg-purple-600 border-purple-600"
                                : "bg-black/50 border-white/30 hover:border-white/60"
                            }`}
                            onClick={() => {
                              const newSelected = new Set(selectedFiles);
                              if (newSelected.has(file.id)) {
                                newSelected.delete(file.id);
                              } else {
                                newSelected.add(file.id);
                              }
                              setSelectedFiles(newSelected);
                            }}
                          >
                            {selectedFiles.has(file.id) && (
                              <Check size={14} className="text-white" />
                            )}
                          </button>
                        </div>
                      )}

                    {/* External Link */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-6 h-6 bg-black/70 rounded flex items-center justify-center text-white hover:bg-black/90"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  {/* File Info */}
                  <div
                    className={`${
                      viewMode === "grid" ? "p-3" : "flex-1 min-w-0"
                    }`}
                  >
                    <h4 className="text-white text-sm font-medium truncate mb-1">
                      {file.name}
                    </h4>

                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="capitalize">
                        {file.isFolder ? "Folder" : file.mimeType.split("/")[1]}
                      </span>
                      {!file.isFolder && <span>{file.size}</span>}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(file.modifiedTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {nextPageToken && !isLoading && (
            <div className="text-center">
              <Button
                onClick={() => loadFolderContents(currentFolder, nextPageToken)}
                variant="outline"
                className="bg-black/60 border-white/10 text-white"
              >
                Load More Files
              </Button>
            </div>
          )}

          {/* No Results */}
          {!isLoading && filteredFiles.length === 0 && (
            <div className="text-center py-12">
              <FileImage className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
              <p className="text-gray-400 text-lg mb-2">No files found</p>
              <p className="text-gray-500 text-sm">
                {searchQuery || selectedFileType !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "This folder appears to be empty or you don't have permission to view it"}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BrowseTab;
