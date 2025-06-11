"use client";
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Grid,
  List,
  Download,
  Trash,
  Eye,
  Calendar,
  FileImage,
  FolderOpen,
  Check,
  X,
  Star,
  ExternalLink,
  Plus,
  Edit,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronLeft,
  Home,
  MoreVertical,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Layers,
  Filter,
  Archive,
  Move,
  Copy,
  Info,
} from "lucide-react";

// Import the interfaces
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
  folderId?: string;
}

interface VaultFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
  description?: string;
  color?: string;
}

interface VaultTabProps {
  datasetItems: DatasetItem[];
  setDatasetItems: React.Dispatch<React.SetStateAction<DatasetItem[]>>;
  folders: VaultFolder[];
  setFolders: React.Dispatch<React.SetStateAction<VaultFolder[]>>;
}

const VaultTab: React.FC<VaultTabProps> = ({
  datasetItems,
  setDatasetItems,
  folders,
  setFolders,
}) => {
  // State management
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"date" | "name" | "category" | "size">(
    "date"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<VaultFolder[]>([]);

  // Folder creation state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#8B5CF6");

  // UI state
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState<DatasetItem | null>(null);

  // Folder colors
  const folderColors = [
    "#8B5CF6", // Purple
    "#3B82F6", // Blue
    "#10B981", // Green
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5A2B", // Brown
    "#6B7280", // Gray
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#84CC16", // Lime
  ];

  // Get items for current folder
  const getCurrentFolderItems = () => {
    return datasetItems.filter((item) => {
      if (currentFolderId === null) {
        return !item.folderId || item.folderId === undefined;
      }
      return item.folderId === currentFolderId;
    });
  };

  // Get subfolders for current folder
  const getCurrentSubfolders = () => {
    return folders.filter((folder) => {
      if (currentFolderId === null) {
        return !folder.parentId || folder.parentId === undefined;
      }
      return folder.parentId === currentFolderId;
    });
  };

  // Get all categories
  const getAllCategories = () => {
    const categories = new Set(datasetItems.map((item) => item.category));
    return Array.from(categories).sort();
  };

  // Filter and sort items
  const filteredAndSortedItems = getCurrentFolderItems()
    .filter((item) => {
      const matchesSearch =
        item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchesSource =
        selectedSource === "all" || item.source === selectedSource;
      return matchesSearch && matchesCategory && matchesSource;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          comparison = a.dateAdded.getTime() - b.dateAdded.getTime();
          break;
        case "name":
          comparison = a.filename.localeCompare(b.filename);
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
        case "size":
          // For demo purposes, sort by filename length
          comparison = a.filename.length - b.filename.length;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Create new folder
  const createFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: VaultFolder = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      parentId: currentFolderId || undefined,
      createdAt: new Date(),
      description: newFolderDescription.trim() || undefined,
      color: newFolderColor,
    };

    setFolders((prev) => [...prev, newFolder]);

    // Reset form
    setNewFolderName("");
    setNewFolderDescription("");
    setNewFolderColor("#8B5CF6");
    setShowCreateFolder(false);
  };

  // Navigate to folder
  const navigateToFolder = (folder: VaultFolder) => {
    const newPath = [...folderPath];
    if (currentFolderId) {
      const currentFolder = folders.find((f) => f.id === currentFolderId);
      if (currentFolder) {
        newPath.push(currentFolder);
      }
    }

    setFolderPath(newPath);
    setCurrentFolderId(folder.id);
    setSelectedItems(new Set());
  };

  // Navigate back
  const navigateBack = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      const previousFolder = newPath.pop();
      setFolderPath(newPath);
      setCurrentFolderId(previousFolder?.parentId || null);
      setSelectedItems(new Set());
    }
  };

  // Navigate to root
  const navigateToRoot = () => {
    setFolderPath([]);
    setCurrentFolderId(null);
    setSelectedItems(new Set());
  };

  // Navigate to specific folder in breadcrumb
  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      navigateToRoot();
      return;
    }

    const targetFolder = folderPath[index];
    const newPath = folderPath.slice(0, index);
    setFolderPath(newPath);
    setCurrentFolderId(targetFolder.id);
    setSelectedItems(new Set());
  };

  // Delete folder
  const deleteFolder = (folderId: string) => {
    // Move all items in this folder to parent folder
    const folderToDelete = folders.find((f) => f.id === folderId);
    if (folderToDelete) {
      setDatasetItems((prev) =>
        prev.map((item) =>
          item.folderId === folderId
            ? { ...item, folderId: folderToDelete.parentId }
            : item
        )
      );
    }

    // Remove folder and all subfolders
    const getAllSubfolderIds = (parentId: string): string[] => {
      const subfolders = folders.filter((f) => f.parentId === parentId);
      let allIds = [parentId];
      subfolders.forEach((subfolder) => {
        allIds = [...allIds, ...getAllSubfolderIds(subfolder.id)];
      });
      return allIds;
    };

    const idsToRemove = getAllSubfolderIds(folderId);
    setFolders((prev) => prev.filter((f) => !idsToRemove.includes(f.id)));

    // Navigate back if we're in a deleted folder
    if (idsToRemove.includes(currentFolderId || "")) {
      navigateToRoot();
    }
  };

  // Move items to folder
  const moveItemsToFolder = (
    itemIds: string[],
    targetFolderId: string | null
  ) => {
    setDatasetItems((prev) =>
      prev.map((item) =>
        itemIds.includes(item.id)
          ? { ...item, folderId: targetFolderId || undefined }
          : item
      )
    );
    setSelectedItems(new Set());
  };

  // Utility functions
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getSourceIcon = (source: DatasetItem["source"]) => {
    switch (source) {
      case "generated":
        return <Star size={12} className="text-purple-400" />;
      case "drive":
        return <FolderOpen size={12} className="text-blue-400" />;
      case "imported":
        return <FileImage size={12} className="text-green-400" />;
      default:
        return <FileImage size={12} className="text-gray-400" />;
    }
  };

  const getSourceLabel = (source: DatasetItem["source"]) => {
    switch (source) {
      case "generated":
        return "Generated";
      case "drive":
        return "Google Drive";
      case "imported":
        return "Imported";
      default:
        return "Unknown";
    }
  };

  // Management functions
  const handleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedItems.map((item) => item.id)));
    }
  };

  const removeFromVault = (itemIds: string[]) => {
    setDatasetItems((prev) =>
      prev.filter((item) => !itemIds.includes(item.id))
    );
    setSelectedItems(new Set());
  };

  const downloadImage = (item: DatasetItem) => {
    const link = document.createElement("a");
    link.href = item.imageUrl;
    link.download = item.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSelected = () => {
    const selectedItemsArray = filteredAndSortedItems.filter((item) =>
      selectedItems.has(item.id)
    );
    selectedItemsArray.forEach((item) => downloadImage(item));
  };

  // Handle individual file selection
  const handleItemSelection = (itemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedItems((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  };

  const currentSubfolders = getCurrentSubfolders();
  const currentFolderName = currentFolderId
    ? folders.find((f) => f.id === currentFolderId)?.name || "Unknown"
    : "Vault";

  const allFoldersFlat = folders.map((folder) => ({
    ...folder,
    fullPath: getFolderFullPath(folder.id),
  }));

  // Get full path for a folder
  function getFolderFullPath(folderId: string): string {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return "";

    if (!folder.parentId) return folder.name;

    const parentPath = getFolderFullPath(folder.parentId);
    return parentPath ? `${parentPath} > ${folder.name}` : folder.name;
  }

  return (
    <div className="h-[80vh] flex bg-black/30 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 bg-black/50 border-r border-white/10 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-semibold flex items-center">
              <Archive size={18} className="mr-2 text-purple-400" />
              Vault Explorer
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {datasetItems.length} items • {folders.length} folders
            </p>
          </div>

          {/* Quick Actions */}
          <div className="p-3 border-b border-white/10">
            <Button
              onClick={() => setShowCreateFolder(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm"
              size="sm"
            >
              <FolderPlus size={14} className="mr-2" />
              New Folder
            </Button>
          </div>

          {/* Folder Tree */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {/* Root */}
              <button
                onClick={navigateToRoot}
                className={`w-full text-left p-2 rounded flex items-center text-sm transition-colors ${
                  currentFolderId === null
                    ? "bg-purple-600/30 text-purple-200"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                <Home size={14} className="mr-2 text-blue-400" />
                Root
                <span className="ml-auto text-xs text-gray-500">
                  {datasetItems.filter((item) => !item.folderId).length}
                </span>
              </button>

              {/* Folders */}
              {allFoldersFlat
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => {
                      // Navigate to folder by building path
                      const pathToFolder = [];
                      let current = folder;

                      while (current.parentId) {
                        const parent = folders.find(
                          (f) => f.id === current.parentId
                        );
                        if (parent) {
                          pathToFolder.unshift(parent);
                          current = parent;
                        } else {
                          break;
                        }
                      }

                      setFolderPath(pathToFolder);
                      setCurrentFolderId(folder.id);
                      setSelectedItems(new Set());
                    }}
                    className={`w-full text-left p-2 rounded flex items-center text-sm transition-colors ${
                      currentFolderId === folder.id
                        ? "bg-purple-600/30 text-purple-200"
                        : "text-gray-300 hover:bg-white/5"
                    }`}
                  >
                    <Folder
                      size={14}
                      className="mr-2 flex-shrink-0"
                      style={{ color: folder.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{folder.name}</div>
                      {folder.parentId && (
                        <div className="text-xs text-gray-500 truncate">
                          in{" "}
                          {folders.find((f) => f.id === folder.parentId)?.name}
                        </div>
                      )}
                    </div>
                    <span className="ml-2 text-xs text-gray-500 flex-shrink-0">
                      {
                        datasetItems.filter(
                          (item) => item.folderId === folder.id
                        ).length
                      }
                    </span>
                  </button>
                ))}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-white/10">
            <div className="text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Selected:</span>
                <span>{selectedItems.size}</span>
              </div>
              <div className="flex justify-between">
                <span>Filtered:</span>
                <span>{filteredAndSortedItems.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="bg-black/40 border-b border-white/10 p-3">
          <div className="flex items-center space-x-3">
            {/* Sidebar Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-gray-400 hover:text-white"
            >
              <Layers size={16} />
            </Button>

            {/* Navigation */}
            <div className="flex items-center space-x-1">
              {folderPath.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateBack}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft size={16} />
                </Button>
              )}

              <button
                onClick={navigateToRoot}
                className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors bg-black/40 rounded px-2 py-1"
              >
                <Home size={14} />
                <span className="text-sm">Vault</span>
              </button>

              {folderPath.map((folder, index) => (
                <React.Fragment key={folder.id}>
                  <ChevronRight size={12} className="text-gray-500" />
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className="text-gray-300 hover:text-white transition-colors bg-black/40 rounded px-2 py-1 text-sm"
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}

              {currentFolderId && (
                <>
                  <ChevronRight size={12} className="text-gray-500" />
                  <div className="text-white bg-purple-600/30 rounded px-2 py-1 text-sm">
                    {currentFolderName}
                  </div>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* View Controls */}
            <div className="flex items-center space-x-2">
              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={14}
                />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/60 border-white/10 text-white pl-8 w-48 h-8 text-sm"
                />
              </div>

              {/* Filters */}
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-28 bg-black/60 border-white/10 text-white h-8 text-sm">
                  <Filter size={14} className="mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10 text-white">
                  <SelectItem value="all">All</SelectItem>
                  {getAllCategories().map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger className="w-28 bg-black/60 border-white/10 text-white h-8 text-sm">
                  <ArrowUpDown size={14} className="mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10 text-white">
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="text-gray-400 hover:text-white h-8 w-8 p-0"
              >
                {sortOrder === "asc" ? (
                  <SortAsc size={14} />
                ) : (
                  <SortDesc size={14} />
                )}
              </Button>

              {/* View Mode */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
                className="text-gray-400 hover:text-white h-8 w-8 p-0"
              >
                {viewMode === "grid" ? <List size={14} /> : <Grid size={14} />}
              </Button>

              {/* Preview Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className={`h-8 w-8 p-0 ${
                  showPreview
                    ? "text-purple-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Info size={14} />
              </Button>
            </div>
          </div>

          {/* Selection Bar */}
          {selectedItems.size > 0 && (
            <div className="mt-3 flex items-center justify-between bg-purple-900/20 border border-purple-500/30 rounded-lg p-2">
              <span className="text-purple-300 text-sm font-medium">
                {selectedItems.size} item{selectedItems.size > 1 ? "s" : ""}{" "}
                selected
              </span>

              <div className="flex space-x-2">
                <Select
                  onValueChange={(value) =>
                    moveItemsToFolder(
                      Array.from(selectedItems),
                      value === "root" ? null : value
                    )
                  }
                >
                  <SelectTrigger className="w-32 bg-blue-900/30 border-blue-500/30 text-blue-300 h-8 text-sm">
                    <Move size={12} className="mr-1" />
                    <span>Move</span>
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10 text-white">
                    <SelectItem value="root">
                      <div className="flex items-center">
                        <Home size={14} className="mr-2" />
                        Root
                      </div>
                    </SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center">
                          <Folder
                            size={14}
                            className="mr-2"
                            style={{ color: folder.color }}
                          />
                          {folder.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  onClick={downloadSelected}
                  className="bg-green-600 hover:bg-green-700 text-white h-8 text-sm"
                >
                  <Download size={12} className="mr-1" />
                  Download
                </Button>

                <Button
                  size="sm"
                  onClick={() => removeFromVault(Array.from(selectedItems))}
                  className="bg-red-600 hover:bg-red-700 text-white h-8 text-sm"
                >
                  <Trash size={12} className="mr-1" />
                  Delete
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItems(new Set())}
                  className="text-gray-400 hover:text-white h-8 w-8 p-0"
                >
                  <X size={12} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex min-h-0">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {currentSubfolders.length > 0 ||
            filteredAndSortedItems.length > 0 ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3"
                    : "space-y-1"
                }
              >
                {/* Folders First */}
                {currentSubfolders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`group relative bg-black/30 rounded-lg overflow-hidden border border-white/10 hover:border-blue-400/50 transition-all cursor-pointer ${
                      viewMode === "list"
                        ? "flex items-center space-x-3 p-3"
                        : ""
                    }`}
                    onClick={() => navigateToFolder(folder)}
                  >
                    <div
                      className={`relative ${
                        viewMode === "grid"
                          ? "aspect-square"
                          : "w-12 h-12 flex-shrink-0"
                      } bg-gradient-to-br from-black/20 to-black/60 flex items-center justify-center rounded`}
                    >
                      <Folder
                        size={viewMode === "grid" ? 32 : 24}
                        style={{ color: folder.color }}
                      />

                      {/* Folder Actions */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-black/70 hover:bg-red-600/80 text-red-300 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFolder(folder.id);
                          }}
                        >
                          <Trash size={10} />
                        </Button>
                      </div>
                    </div>

                    <div
                      className={`${
                        viewMode === "grid" ? "p-2" : "flex-1 min-w-0"
                      }`}
                    >
                      <h4 className="text-white text-sm font-medium truncate">
                        {folder.name}
                      </h4>

                      {viewMode === "list" && folder.description && (
                        <p className="text-gray-400 text-xs truncate">
                          {folder.description}
                        </p>
                      )}

                      <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                        <span>Folder</span>
                        <span>
                          {
                            datasetItems.filter(
                              (item) => item.folderId === folder.id
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Items */}
                {filteredAndSortedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`group relative bg-black/30 rounded-lg overflow-hidden border border-white/10 hover:border-purple-400/50 transition-all ${
                      selectedItems.has(item.id)
                        ? "ring-1 ring-purple-400 shadow-lg shadow-purple-400/20"
                        : ""
                    } ${
                      viewMode === "list"
                        ? "flex items-center space-x-3 p-3"
                        : ""
                    }`}
                    onClick={() => setPreviewItem(item)}
                  >
                    {/* Image */}
                    <div
                      className={`relative ${
                        viewMode === "grid"
                          ? "aspect-square"
                          : "w-12 h-12 flex-shrink-0"
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.filename}
                        className="w-full h-full object-cover rounded"
                        loading="lazy"
                      />

                      {/* Selection Checkbox */}
                      <div className="absolute top-1 left-1 z-20">
                        <button
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            selectedItems.has(item.id)
                              ? "bg-purple-600 border-purple-600 shadow-lg"
                              : "bg-black/70 border-white/40 hover:border-white/80"
                          }`}
                          onClick={(e) => handleItemSelection(item.id, e)}
                        >
                          {selectedItems.has(item.id) && (
                            <Check size={10} className="text-white" />
                          )}
                        </button>
                      </div>

                      {/* Source Badge */}
                      <div className="absolute top-1 right-1 z-10">
                        <div className="bg-black/70 rounded px-1 py-0.5">
                          {getSourceIcon(item.source)}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1 z-10">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-white/20 hover:bg-white/30 text-white h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadImage(item);
                          }}
                        >
                          <Download size={12} />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-white/20 hover:bg-white/30 text-white h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(item.imageUrl, "_blank");
                          }}
                        >
                          <Eye size={12} />
                        </Button>

                        {item.driveFileId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="bg-white/20 hover:bg-white/30 text-white h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                `https://drive.google.com/file/d/${item.driveFileId}/view`,
                                "_blank"
                              );
                            }}
                          >
                            <ExternalLink size={12} />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Item Info */}
                    <div
                      className={`${
                        viewMode === "grid" ? "p-2" : "flex-1 min-w-0"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-white text-sm font-medium truncate flex-1">
                          {item.filename}
                        </h4>
                        {viewMode === "grid" && (
                          <span className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-1.5 py-0.5 text-xs font-semibold text-gray-300 ml-1">
                            {item.category}
                          </span>
                        )}
                      </div>

                      {viewMode === "list" && (
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <span className="flex items-center space-x-1">
                            <Calendar size={10} />
                            <span>{formatDate(item.dateAdded)}</span>
                          </span>
                          <span className="px-2 py-0.5 bg-black/40 rounded text-gray-300">
                            {item.category}
                          </span>
                          <span className="flex items-center space-x-1">
                            {getSourceIcon(item.source)}
                            <span>{getSourceLabel(item.source)}</span>
                          </span>
                        </div>
                      )}

                      {/* Tags for grid view */}
                      {viewMode === "grid" && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded border border-purple-500/30 bg-purple-900/20 px-1 py-0.5 text-xs font-semibold text-purple-300"
                            >
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 2 && (
                            <span className="inline-flex items-center rounded border border-gray-500/30 bg-gray-900/20 px-1 py-0.5 text-xs font-semibold text-gray-400">
                              +{item.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
                <p className="text-gray-400 text-lg mb-2">
                  {currentFolderId
                    ? "This folder is empty"
                    : "No items in vault"}
                </p>
                <p className="text-gray-500 text-sm">
                  {currentFolderId
                    ? "Add images or create subfolders to organize this folder"
                    : "Import images from the Browse tab to get started"}
                </p>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          {showPreview && previewItem && (
            <div className="w-80 bg-black/50 border-l border-white/10 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* Preview Image */}
                <div className="aspect-square rounded-lg overflow-hidden bg-black/40">
                  <img
                    src={previewItem.imageUrl}
                    alt={previewItem.filename}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-white font-medium mb-2">
                    {previewItem.filename}
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      <span className="text-white">{previewItem.category}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Source:</span>
                      <span className="text-white flex items-center space-x-1">
                        {getSourceIcon(previewItem.source)}
                        <span>{getSourceLabel(previewItem.source)}</span>
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Added:</span>
                      <span className="text-white">
                        {formatDate(previewItem.dateAdded)}
                      </span>
                    </div>
                  </div>

                  {previewItem.description && (
                    <div className="mt-3">
                      <span className="text-gray-400 text-sm">
                        Description:
                      </span>
                      <p className="text-white text-sm mt-1">
                        {previewItem.description}
                      </p>
                    </div>
                  )}

                  {previewItem.tags.length > 0 && (
                    <div className="mt-3">
                      <span className="text-gray-400 text-sm">Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {previewItem.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded border border-purple-500/30 bg-purple-900/20 px-2 py-1 text-xs font-semibold text-purple-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    onClick={() => downloadImage(previewItem)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <Download size={14} className="mr-2" />
                    Download
                  </Button>

                  <Button
                    onClick={() => window.open(previewItem.imageUrl, "_blank")}
                    variant="outline"
                    className="w-full bg-black/60 border-white/10 text-white"
                    size="sm"
                  >
                    <Eye size={14} className="mr-2" />
                    View Full Size
                  </Button>

                  {previewItem.driveFileId && (
                    <Button
                      onClick={() =>
                        window.open(
                          `https://drive.google.com/file/d/${previewItem.driveFileId}/view`,
                          "_blank"
                        )
                      }
                      variant="outline"
                      className="w-full bg-black/60 border-white/10 text-white"
                      size="sm"
                    >
                      <ExternalLink size={14} className="mr-2" />
                      Open in Drive
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Folder Dialog */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white text-lg font-semibold mb-4">
              Create New Folder
            </h3>

            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="folder-name"
                  className="text-gray-300 mb-2 block"
                >
                  Folder Name *
                </Label>
                <Input
                  id="folder-name"
                  placeholder="Enter folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="bg-black/60 border-white/10 text-white"
                  autoFocus
                />
              </div>

              <div>
                <Label
                  htmlFor="folder-description"
                  className="text-gray-300 mb-2 block"
                >
                  Description (Optional)
                </Label>
                <Textarea
                  id="folder-description"
                  placeholder="Folder description..."
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  className="bg-black/60 border-white/10 text-white"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {folderColors.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newFolderColor === color
                          ? "border-white scale-110"
                          : "border-gray-600 hover:border-gray-400"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewFolderColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={createFolder}
                  disabled={!newFolderName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <FolderPlus size={16} className="mr-2" />
                  Create Folder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateFolder(false);
                    setNewFolderName("");
                    setNewFolderDescription("");
                    setNewFolderColor("#8B5CF6");
                  }}
                  className="flex-1 bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/30"
                >
                  <X size={16} className="mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultTab;
