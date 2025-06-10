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

    return {
      totalItems,
      sourceStats,
      categoryStats,
      folderStats,
      totalFolders: folders.length,
    };
  };

  const stats = getDatasetStats();

  return (
    <>
      <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white">Dataset Collection</CardTitle>
              <CardDescription className="text-gray-400 mt-1">
                Browse and manage your image dataset from Google Drive
              </CardDescription>
            </div>

            {/* Dataset management actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-900/30 border-blue-500/30 text-blue-300"
                onClick={() => setShowStats(!showStats)}
              >
                <Database size={16} className="mr-1" />
                {showStats ? "Hide Stats" : "Show Stats"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="bg-purple-900/30 border-purple-500/30 text-purple-300"
                onClick={() => setShowFolderDialog(true)}
              >
                <FolderOpen size={16} className="mr-1" />
                Organize Vault
              </Button>
            </div>
          </div>

          {/* Dataset Statistics */}
          {showStats && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Items */}
              <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-2 mb-2">
                  <Archive size={16} className="text-blue-400" />
                  <h4 className="text-white font-medium">Total Items</h4>
                </div>
                <p className="text-2xl font-bold text-blue-400">
                  {stats.totalItems}
                </p>
                <p className="text-xs text-gray-400">
                  {stats.totalFolders} folders
                </p>
              </div>

              {/* Source Breakdown */}
              <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-2 mb-2">
                  <Settings size={16} className="text-green-400" />
                  <h4 className="text-white font-medium">Sources</h4>
                </div>
                <div className="space-y-1">
                  {Object.entries(stats.sourceStats).map(([source, count]) => (
                    <div key={source} className="flex justify-between text-sm">
                      <span className="text-gray-300 capitalize">{source}</span>
                      <span className="text-green-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-2 mb-2">
                  <Database size={16} className="text-purple-400" />
                  <h4 className="text-white font-medium">Categories</h4>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {Object.entries(stats.categoryStats).map(
                    ([category, count]) => (
                      <div
                        key={category}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-gray-300 capitalize">
                          {category}
                        </span>
                        <span className="text-purple-400">{count}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Folder Distribution */}
              <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-2 mb-2">
                  <Folder size={16} className="text-yellow-400" />
                  <h4 className="text-white font-medium">Distribution</h4>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {Object.entries(stats.folderStats).map(([folder, count]) => (
                    <div key={folder} className="flex justify-between text-sm">
                      <span className="text-gray-300 truncate">{folder}</span>
                      <span className="text-yellow-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Browse Tab Content - Now directly embedded with enhanced vault integration */}
          <BrowseTab
            datasetItems={datasetItems}
            setDatasetItems={setDatasetItems}
            onAddToVault={handleAddToVault}
          />
        </CardContent>
      </Card>

      {/* Enhanced Folder Selection Dialog */}
      {showFolderDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white text-lg font-semibold mb-4">
              {pendingVaultItems.length > 0
                ? `Choose Folder for ${pendingVaultItems.length} items`
                : "Organize Vault Folders"}
            </h3>

            <div className="space-y-4">
              {pendingVaultItems.length > 0 && (
                <>
                  <div className="bg-black/40 rounded-lg p-3 border border-white/10">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      Items to add:
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {pendingVaultItems.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center space-x-2 text-xs"
                        >
                          <div className="w-8 h-8 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={item.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-gray-400 truncate">
                            {item.filename}
                          </span>
                        </div>
                      ))}
                      {pendingVaultItems.length > 5 && (
                        <div className="text-xs text-gray-500">
                          +{pendingVaultItems.length - 5} more items...
                        </div>
                      )}
                    </div>
                  </div>

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
                              {folder.name}
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
                </>
              )}

              {/* Quick folder creation */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-gray-400 text-sm mb-2">
                  Create a new folder:
                </p>
                <div className="flex space-x-2">
                  <Input
                    placeholder="New folder name..."
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
                    size="sm"
                    onClick={createQuickFolder}
                    disabled={!newQuickFolderName.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-3">
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

              {/* Folder management info */}
              {!pendingVaultItems.length && (
                <div className="border-t border-white/10 pt-4">
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                    <h4 className="text-blue-300 font-medium text-sm mb-2">
                      Folder Management
                    </h4>
                    <p className="text-blue-200 text-xs">
                      You currently have {folders.length} folders and{" "}
                      {stats.totalItems} items in your vault. Use folders to
                      organize your images by project, style, or any
                      classification that works for you.
                    </p>
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
