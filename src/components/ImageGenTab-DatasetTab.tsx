"use client";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BrowseTab from "./ImageGenTab-DatasetTab-BrowseTab";
import {
  Database,
  FolderOpen,
  Plus,
  Folder,
  Home,
  Check,
  X,
  Settings,
  Archive,
  BarChart3,
  TrendingUp,
  Users,
  HardDrive,
  Sparkles,
  Upload,
} from "lucide-react";
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

// Import the interfaces from the main component
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

interface GeneratedImage {
  id: string;
  imageUrl: string;
  filename: string;
  prompt: string;
  negativePrompt?: string;
  settings: any; // GenerationSettings
  timestamp: Date;
  isBookmarked?: boolean;
  isInVault?: boolean;
}

interface DatasetTabProps {
  datasetItems: DatasetItem[];
  setDatasetItems: React.Dispatch<React.SetStateAction<DatasetItem[]>>;
  generatedImages: GeneratedImage[];
  folders: VaultFolder[];
  setFolders: React.Dispatch<React.SetStateAction<VaultFolder[]>>;
}

const DatasetTab: React.FC<DatasetTabProps> = ({
  datasetItems,
  setDatasetItems,
  generatedImages,
  folders,
  setFolders,
}) => {
  // Folder selection state for adding items from dataset to vault
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [selectedFolderForAdd, setSelectedFolderForAdd] = useState<
    string | null
  >(null);
  const [pendingVaultItems, setPendingVaultItems] = useState<DatasetItem[]>([]);
  const [newQuickFolderName, setNewQuickFolderName] = useState("");

  // Stats state
  const [showStats, setShowStats] = useState(false);

  // Function to initiate adding items to vault from Browse tab
  const handleAddToVault = (items: DatasetItem[]) => {
    setPendingVaultItems(items);
    setShowFolderDialog(true);
  };

  // Create quick folder function
  const createQuickFolder = () => {
    if (!newQuickFolderName.trim()) return;

    const newFolder: VaultFolder = {
      id: `folder_${Date.now()}`,
      name: newQuickFolderName.trim(),
      parentId: undefined, // Always create at root level for quick creation
      createdAt: new Date(),
      color: "#8B5CF6", // Default purple color
    };

    setFolders((prev) => [...prev, newFolder]);
    setSelectedFolderForAdd(newFolder.id);
    setNewQuickFolderName("");
  };

  // Complete vault addition
  const completeVaultAddition = () => {
    // Check for duplicates
    const existingIds = new Set(datasetItems.map((item) => item.id));
    const newItems = pendingVaultItems.filter(
      (item) => !existingIds.has(item.id)
    );

    if (newItems.length === 0) {
      // All items already exist, just close dialog
      cancelVaultAddition();
      return;
    }

    // Add folder ID to new items
    const updatedItems = newItems.map((item) => ({
      ...item,
      folderId: selectedFolderForAdd || undefined,
    }));

    // Add to dataset items
    setDatasetItems((prev) => [...updatedItems, ...prev]);

    // Reset dialog state
    setShowFolderDialog(false);
    setSelectedFolderForAdd(null);
    setPendingVaultItems([]);
    setNewQuickFolderName("");
  };

  // Cancel vault addition
  const cancelVaultAddition = () => {
    setShowFolderDialog(false);
    setSelectedFolderForAdd(null);
    setPendingVaultItems([]);
    setNewQuickFolderName("");
  };

  // Get dataset statistics
  const getDatasetStats = () => {
    const totalItems = datasetItems.length;
    const sourceStats = datasetItems.reduce((acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryStats = datasetItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const folderStats = datasetItems.reduce((acc, item) => {
      const folderName = item.folderId
        ? folders.find((f) => f.id === item.folderId)?.name || "Unknown Folder"
        : "Root";
      acc[folderName] = (acc[folderName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentItems = datasetItems.filter(
      (item) => item.dateAdded >= weekAgo
    ).length;

    return {
      totalItems,
      sourceStats,
      categoryStats,
      folderStats,
      totalFolders: folders.length,
      recentItems,
    };
  };

  const stats = getDatasetStats();

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "generated":
        return <Sparkles size={16} className="text-purple-400" />;
      case "drive":
        return <HardDrive size={16} className="text-blue-400" />;
      case "imported":
        return <Upload size={16} className="text-green-400" />;
      default:
        return <Database size={16} className="text-gray-400" />;
    }
  };

  return (
    <>
      <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-purple-600/20 rounded-lg">
                  <Database className="text-purple-400" size={24} />
                </div>
                <div>
                  <CardTitle className="text-white text-xl">
                    Dataset Collection
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Browse and import images from Google Drive
                  </CardDescription>
                </div>
              </div>

              {/* Quick Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 rounded-lg p-3 border border-purple-500/20">
                  <div className="flex items-center space-x-2">
                    <Archive size={14} className="text-purple-400" />
                    <span className="text-purple-300 text-sm font-medium">
                      Total Items
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {stats.totalItems}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 rounded-lg p-3 border border-blue-500/20">
                  <div className="flex items-center space-x-2">
                    <Folder size={14} className="text-blue-400" />
                    <span className="text-blue-300 text-sm font-medium">
                      Folders
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {stats.totalFolders}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-600/20 to-green-800/20 rounded-lg p-3 border border-green-500/20">
                  <div className="flex items-center space-x-2">
                    <TrendingUp size={14} className="text-green-400" />
                    <span className="text-green-300 text-sm font-medium">
                      This Week
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {stats.recentItems}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-amber-600/20 to-amber-800/20 rounded-lg p-3 border border-amber-500/20">
                  <div className="flex items-center space-x-2">
                    <BarChart3 size={14} className="text-amber-400" />
                    <span className="text-amber-300 text-sm font-medium">
                      Categories
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {Object.keys(stats.categoryStats).length}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-900/30 border-blue-500/30 text-blue-300 hover:bg-blue-900/50"
                onClick={() => setShowStats(!showStats)}
              >
                <BarChart3 size={16} className="mr-1" />
                {showStats ? "Hide" : "Show"} Details
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="bg-purple-900/30 border-purple-500/30 text-purple-300 hover:bg-purple-900/50"
                onClick={() => setShowFolderDialog(true)}
              >
                <FolderOpen size={16} className="mr-1" />
                Manage Vault
              </Button>
            </div>
          </div>

          {/* Detailed Statistics */}
          {showStats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 p-6 bg-black/40 rounded-lg border border-white/10">
              {/* Source Breakdown */}
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <Settings size={16} className="mr-2 text-green-400" />
                  Source Distribution
                </h4>
                <div className="space-y-2">
                  {Object.entries(stats.sourceStats).map(([source, count]) => (
                    <div
                      key={source}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        {getSourceIcon(source)}
                        <span className="text-gray-300 capitalize">
                          {source}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="bg-gray-700 rounded-full h-2 w-20">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${(count / stats.totalItems) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-green-400 text-sm font-medium w-8 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown */}
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <Database size={16} className="mr-2 text-purple-400" />
                  Top Categories
                </h4>
                <div className="space-y-2">
                  {Object.entries(stats.categoryStats)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([category, count]) => (
                      <div
                        key={category}
                        className="flex items-center justify-between"
                      >
                        <span className="text-gray-300 capitalize truncate">
                          {category}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="bg-gray-700 rounded-full h-2 w-16">
                            <div
                              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${(count / stats.totalItems) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-purple-400 text-sm font-medium w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Folder Distribution */}
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <Folder size={16} className="mr-2 text-yellow-400" />
                  Folder Usage
                </h4>
                <div className="space-y-2">
                  {Object.entries(stats.folderStats)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([folder, count]) => (
                      <div
                        key={folder}
                        className="flex items-center justify-between"
                      >
                        <span className="text-gray-300 truncate">{folder}</span>
                        <div className="flex items-center space-x-2">
                          <div className="bg-gray-700 rounded-full h-2 w-16">
                            <div
                              className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${(count / stats.totalItems) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-yellow-400 text-sm font-medium w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Browse Tab Content */}
          <BrowseTab
            datasetItems={datasetItems}
            setDatasetItems={setDatasetItems}
            onAddToVault={handleAddToVault}
          />
        </CardContent>
      </Card>

      {/* Enhanced Folder Selection Dialog */}
      {showFolderDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <FolderOpen className="text-purple-400" size={20} />
              </div>
              <div>
                <h3 className="text-white text-lg font-semibold">
                  {pendingVaultItems.length > 0
                    ? `Organize ${pendingVaultItems.length} Items`
                    : "Vault Management"}
                </h3>
                <p className="text-gray-400 text-sm">
                  Choose a folder to organize your images
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {pendingVaultItems.length > 0 && (
                <>
                  {/* Items Preview */}
                  <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-4 border border-purple-500/20">
                    <h4 className="text-purple-300 font-medium mb-3 flex items-center">
                      <Archive size={16} className="mr-2" />
                      Items to Add ({pendingVaultItems.length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto">
                      <div className="grid grid-cols-6 gap-2">
                        {pendingVaultItems.slice(0, 12).map((item) => (
                          <div
                            key={item.id}
                            className="aspect-square bg-gray-700 rounded overflow-hidden"
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {pendingVaultItems.length > 12 && (
                          <div className="aspect-square bg-gray-700 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-400">
                              +{pendingVaultItems.length - 12}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Folder Selection */}
                  <div>
                    <Label className="text-gray-300 mb-3 block">
                      Choose Destination
                    </Label>
                    <Select
                      value={selectedFolderForAdd || "root"}
                      onValueChange={(value) =>
                        setSelectedFolderForAdd(value === "root" ? null : value)
                      }
                    >
                      <SelectTrigger className="bg-black/60 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/10 text-white">
                        <SelectItem value="root">
                          <div className="flex items-center">
                            <Home size={16} className="mr-2" />
                            Root Folder
                          </div>
                        </SelectItem>
                        {folders
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                              <div className="flex items-center">
                                <Folder
                                  size={16}
                                  className="mr-2"
                                  style={{ color: folder.color || "#8B5CF6" }}
                                />
                                <span>{folder.name}</span>
                                {folder.parentId && (
                                  <span className="ml-2 text-xs text-gray-400">
                                    (in{" "}
                                    {
                                      folders.find(
                                        (f) => f.id === folder.parentId
                                      )?.name
                                    }
                                    )
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Quick folder creation */}
              <div className="border-t border-white/10 pt-6">
                <Label className="text-gray-300 mb-3 block">
                  Create New Folder
                </Label>
                <div className="flex space-x-3">
                  <Input
                    placeholder="Folder name..."
                    value={newQuickFolderName}
                    onChange={(e) => setNewQuickFolderName(e.target.value)}
                    className="bg-black/60 border-white/10 text-white flex-1"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && newQuickFolderName.trim()) {
                        createQuickFolder();
                      }
                    }}
                  />
                  <Button
                    onClick={createQuickFolder}
                    disabled={!newQuickFolderName.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus size={16} className="mr-1" />
                    Create
                  </Button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-3 pt-2">
                {pendingVaultItems.length > 0 ? (
                  <>
                    <Button
                      onClick={completeVaultAddition}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check size={16} className="mr-2" />
                      Add to{" "}
                      {selectedFolderForAdd
                        ? folders.find((f) => f.id === selectedFolderForAdd)
                            ?.name
                        : "Root"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={cancelVaultAddition}
                      className="flex-1 bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/30"
                    >
                      <X size={16} className="mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={cancelVaultAddition}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    <Check size={16} className="mr-2" />
                    Done
                  </Button>
                )}
              </div>

              {/* Management info */}
              {!pendingVaultItems.length && (
                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-blue-300 font-medium text-sm mb-2 flex items-center">
                    <Users size={16} className="mr-2" />
                    Vault Overview
                  </h4>
                  <div className="space-y-1 text-xs text-blue-200">
                    <p>• {folders.length} folders created</p>
                    <p>• {stats.totalItems} items organized</p>
                    <p>• {stats.recentItems} items added this week</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DatasetTab;
