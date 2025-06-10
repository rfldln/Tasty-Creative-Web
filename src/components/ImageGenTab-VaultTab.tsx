// Debug version of VaultTab to fix folder display issues

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
  Filter,
  Grid,
  List,
  Download,
  Trash,
  Eye,
  Tag,
  Calendar,
  FileImage,
  FolderOpen,
  Check,
  X,
  Star,
  ExternalLink,
  Copy,
  Share,
  Plus,
  Edit,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronLeft,
  Home,
  MoreVertical,
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
  const [sortBy, setSortBy] = useState<"date" | "name" | "category">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<VaultFolder[]>([]);

  // Folder creation state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#8B5CF6");

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
  ];

  // Debug: Log folder and item data
  useEffect(() => {
    console.log("=== VAULT TAB DEBUG ===");
    console.log("Total folders:", folders.length);
    console.log("Current folder ID:", currentFolderId);
    console.log("All folders:", folders);
    console.log("Total dataset items:", datasetItems.length);
    console.log("Items in current folder:", getCurrentFolderItems().length);
    console.log("Subfolders in current folder:", getCurrentSubfolders().length);
  }, [folders, currentFolderId, datasetItems]);

  // Enhanced selection handler
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

  // Get items for current folder
  const getCurrentFolderItems = () => {
    const items = datasetItems.filter((item) => {
      // If no current folder, show items with no folderId (root items)
      if (currentFolderId === null) {
        return !item.folderId || item.folderId === undefined;
      }
      // Otherwise show items with matching folderId
      return item.folderId === currentFolderId;
    });

    console.log(`Items in folder ${currentFolderId || "root"}:`, items.length);
    return items;
  };

  // Get subfolders for current folder
  const getCurrentSubfolders = () => {
    const subfolders = folders.filter((folder) => {
      // If no current folder, show folders with no parentId (root folders)
      if (currentFolderId === null) {
        return !folder.parentId || folder.parentId === undefined;
      }
      // Otherwise show folders with matching parentId
      return folder.parentId === currentFolderId;
    });

    console.log(
      `Subfolders in folder ${currentFolderId || "root"}:`,
      subfolders.length
    );
    return subfolders;
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

    console.log("Creating new folder:", newFolder);
    setFolders((prev) => {
      const updated = [...prev, newFolder];
      console.log("Updated folders list:", updated);
      return updated;
    });

    // Reset form
    setNewFolderName("");
    setNewFolderDescription("");
    setNewFolderColor("#8B5CF6");
    setShowCreateFolder(false);
  };

  // Navigate to folder
  const navigateToFolder = (folder: VaultFolder) => {
    console.log("Navigating to folder:", folder);

    // Build path
    const newPath = [...folderPath];
    if (currentFolderId) {
      const currentFolder = folders.find((f) => f.id === currentFolderId);
      if (currentFolder) {
        newPath.push(currentFolder);
      }
    }

    setFolderPath(newPath);
    setCurrentFolderId(folder.id);
  };

  // Navigate back
  const navigateBack = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      const previousFolder = newPath.pop();
      setFolderPath(newPath);
      setCurrentFolderId(previousFolder?.parentId || null);
    }
  };

  // Navigate to root
  const navigateToRoot = () => {
    setFolderPath([]);
    setCurrentFolderId(null);
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
  };

  // Delete folder
  const deleteFolder = (folderId: string) => {
    console.log("Deleting folder:", folderId);

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

  const currentSubfolders = getCurrentSubfolders();
  const currentFolderName = currentFolderId
    ? folders.find((f) => f.id === currentFolderId)?.name || "Unknown"
    : "Root";

  return (
    <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white">Vault Collection</CardTitle>
            <CardDescription className="text-gray-400">
              Manage your curated dataset collection ({datasetItems.length}{" "}
              items, {folders.length} folders)
            </CardDescription>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-green-900/30 border-green-500/30 text-green-300"
              onClick={() => setShowCreateFolder(true)}
            >
              <FolderPlus size={16} className="mr-1" />
              New Folder
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="bg-black/60 border-white/10 text-white"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List size={16} /> : <Grid size={16} />}
            </Button>

            {selectedItems.size > 0 && (
              <div className="flex space-x-2">
                <Select
                  onValueChange={(value) =>
                    moveItemsToFolder(
                      Array.from(selectedItems),
                      value === "root" ? null : value
                    )
                  }
                >
                  <SelectTrigger className="w-40 bg-blue-900/30 border-blue-500/30 text-blue-300">
                    <Folder size={16} className="mr-1" />
                    <span className="text-xs">Move to...</span>
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10 text-white">
                    <SelectItem value="root">
                      <div className="flex items-center">
                        <Home size={16} className="mr-2" />
                        Root Folder
                      </div>
                    </SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center">
                          <Folder
                            size={16}
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
                  variant="outline"
                  size="sm"
                  className="bg-green-900/30 border-green-500/30 text-green-300"
                  onClick={downloadSelected}
                >
                  <Download size={16} className="mr-1" />
                  Download ({selectedItems.size})
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="bg-red-900/30 border-red-500/30 text-red-300"
                  onClick={() => removeFromVault(Array.from(selectedItems))}
                >
                  <Trash size={16} className="mr-1" />
                  Remove ({selectedItems.size})
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-black/40 rounded-lg p-3 border border-white/10 text-xs text-gray-400">
          <p>
            Debug: Current folder: {currentFolderName} | Subfolders:{" "}
            {currentSubfolders.length} | Items: {getCurrentFolderItems().length}
          </p>
          <p>
            Total folders: {folders.length} | Total items: {datasetItems.length}
          </p>
        </div>

        {/* Folder Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 mt-4 p-3 bg-black/40 rounded-lg border border-white/10">
          <div className="flex items-center space-x-1">
            {folderPath.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateBack}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft size={16} />
              </Button>
            )}

            <button
              onClick={navigateToRoot}
              className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors"
            >
              <Home size={16} />
              <span>Root</span>
            </button>

            {folderPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <ChevronRight size={14} className="text-gray-500" />
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors"
                >
                  <Folder size={16} style={{ color: folder.color }} />
                  <span>{folder.name}</span>
                </button>
              </React.Fragment>
            ))}

            {currentFolderId && (
              <>
                <ChevronRight size={14} className="text-gray-500" />
                <div className="flex items-center space-x-1 text-white">
                  <Folder
                    size={16}
                    style={{
                      color: folders.find((f) => f.id === currentFolderId)
                        ?.color,
                    }}
                  />
                  <span>{currentFolderName}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
              <Input
                placeholder="Search vault items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/60 border-white/10 text-white pl-10"
              />
            </div>
          </div>

          <Select
            value={sortBy}
            onValueChange={(value: "date" | "name" | "category") =>
              setSortBy(value)
            }
          >
            <SelectTrigger className="w-32 bg-black/60 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/10 text-white">
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="bg-black/60 border-white/10 text-white"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>

        {/* Bulk Selection */}
        {(filteredAndSortedItems.length > 0 ||
          currentSubfolders.length > 0) && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="bg-black/60 border-white/10 text-white"
            >
              {selectedItems.size === filteredAndSortedItems.length
                ? "Deselect All"
                : "Select All Items"}
            </Button>

            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>
                {currentSubfolders.length} folders,{" "}
                {filteredAndSortedItems.length} items
              </span>
              {selectedItems.size > 0 && (
                <span className="text-purple-400">
                  {selectedItems.size} selected
                </span>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
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

        {/* Folders and Items Display */}
        {currentSubfolders.length > 0 || filteredAndSortedItems.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                : "space-y-4"
            }
          >
            {/* Folders First */}
            {currentSubfolders.map((folder) => (
              <div
                key={folder.id}
                className={`group relative bg-black/40 rounded-lg overflow-hidden border border-white/10 hover:border-blue-400/30 transition-all cursor-pointer ${
                  viewMode === "list" ? "flex space-x-4 p-4" : ""
                }`}
                onClick={() => navigateToFolder(folder)}
              >
                <div
                  className={`relative ${
                    viewMode === "grid"
                      ? "aspect-square"
                      : "w-24 h-24 flex-shrink-0"
                  } bg-gradient-to-br from-black/20 to-black/60 flex items-center justify-center`}
                >
                  <Folder
                    size={viewMode === "grid" ? 48 : 32}
                    style={{ color: folder.color }}
                  />

                  {/* Folder Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/40"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFolder(folder.id);
                      }}
                    >
                      <Trash size={12} />
                    </Button>
                  </div>
                </div>

                <div
                  className={`${
                    viewMode === "grid" ? "p-3" : "flex-1 min-w-0"
                  }`}
                >
                  <h4 className="text-white text-sm font-medium truncate mb-1">
                    {folder.name}
                  </h4>

                  {folder.description && (
                    <p className="text-gray-400 text-xs line-clamp-2 mb-2">
                      {folder.description}
                    </p>
                  )}

                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Folder</span>
                    <span>{formatDate(folder.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Items */}
            {filteredAndSortedItems.map((item) => (
              <div
                key={item.id}
                className={`group relative bg-black/40 rounded-lg overflow-hidden border border-white/10 hover:border-purple-400/30 transition-all ${
                  selectedItems.has(item.id) ? "ring-2 ring-purple-400" : ""
                } ${viewMode === "list" ? "flex space-x-4 p-4" : ""}`}
              >
                {/* Image */}
                <div
                  className={`relative ${
                    viewMode === "grid"
                      ? "aspect-square"
                      : "w-24 h-24 flex-shrink-0"
                  }`}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2 z-20">
                    <button
                      type="button"
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                        selectedItems.has(item.id)
                          ? "bg-purple-600 border-purple-600 shadow-lg"
                          : "bg-black/70 border-white/40 hover:border-white/80 hover:bg-black/90"
                      }`}
                      onClick={(e) => handleItemSelection(item.id, e)}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {selectedItems.has(item.id) && (
                        <Check size={14} className="text-white" />
                      )}
                    </button>
                  </div>

                  {/* Source Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <div className="flex items-center space-x-1 bg-black/70 rounded px-2 py-1">
                      {getSourceIcon(item.source)}
                      <span className="text-xs text-white">
                        {getSourceLabel(item.source)}
                      </span>
                    </div>
                  </div>

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 z-10">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(item);
                      }}
                    >
                      <Download size={14} />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(item.imageUrl, "_blank");
                      }}
                    >
                      <Eye size={14} />
                    </Button>

                    {item.driveFileId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://drive.google.com/file/d/${item.driveFileId}/view`,
                            "_blank"
                          );
                        }}
                      >
                        <ExternalLink size={14} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Item Info */}
                <div
                  className={`${
                    viewMode === "grid" ? "p-3" : "flex-1 min-w-0"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white text-sm font-medium truncate">
                      {item.filename}
                    </h4>
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 text-xs font-semibold text-gray-300">
                      {item.category}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-gray-400 text-xs line-clamp-2 mb-2">
                      {item.description}
                    </p>
                  )}

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.tags
                        .slice(0, viewMode === "grid" ? 3 : 5)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-900/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300"
                          >
                            {tag}
                          </span>
                        ))}
                      {item.tags.length > (viewMode === "grid" ? 3 : 5) && (
                        <span className="inline-flex items-center rounded-full border border-gray-500/30 bg-gray-900/20 px-2.5 py-0.5 text-xs font-semibold text-gray-400">
                          +{item.tags.length - (viewMode === "grid" ? 3 : 5)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Date and metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar size={10} />
                      <span>{formatDate(item.dateAdded)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
            <p className="text-gray-400 text-lg mb-2">
              {datasetItems.length === 0 && folders.length === 0
                ? "No items or folders in vault"
                : currentFolderId
                ? "This folder is empty"
                : "No items found"}
            </p>
            <p className="text-gray-500 text-sm">
              {datasetItems.length === 0 && folders.length === 0
                ? "Add images from the Browse tab or create folders to organize your collection"
                : currentFolderId
                ? "Create subfolders or add images to organize this folder"
                : "Try adjusting your search or filter criteria"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VaultTab;
