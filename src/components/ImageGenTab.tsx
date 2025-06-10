"use client";
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Import the actual components
import DatasetTab from "./ImageGenTab-DatasetTab";
import VaultTab from "./ImageGenTab-VaultTab";
import VideoTab from "./ImageGenTab-VideoTab";
import PromptGeneratorTab from "./ImageGenTab-PromptGenerator";
import CombinedGallery from "./ImageGenTab-GalleryTab";
import {
  Image,
  Download,
  Save,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Loader2,
  Plus,
  Trash,
  Eye,
  Upload,
  FolderOpen,
  Database,
  Check,
  X,
  Star,
  Grid,
  List,
  Search,
  Filter,
  Bookmark,
  Share,
  Copy,
  ChevronRight,
  ChevronLeft,
  Menu,
  Folder,
  FolderPlus,
  Home,
  Wifi,
  WifiOff,
  Video,
  Wand2,
} from "lucide-react";

// TypeScript interfaces
interface GeneratedImage {
  id: string;
  imageUrl: string;
  filename: string;
  prompt: string;
  negativePrompt?: string;
  settings: GenerationSettings;
  timestamp: Date;
  isBookmarked?: boolean;
  isInVault?: boolean;
  blobUrl?: string; // For handling CORS issues with ComfyUI
}

interface GeneratedVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  filename: string;
  prompt: string;
  negativePrompt?: string;
  settings: any;
  timestamp: Date;
  isBookmarked?: boolean;
  isInVault?: boolean;
  blobUrl?: string;
  duration: number;
  fileSize?: number;
  status: "generating" | "completed" | "failed";
  progress?: number;
  sourceImage?: string;
}

interface GenerationSettings {
  model: string;
  sampler: string;
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  seed?: number;
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

type MediaItem = GeneratedImage | GeneratedVideo;

// FIXED ComfyUI Integration Hook
const useComfyUIGeneration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [availableLoraModels, setAvailableLoraModels] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentNode, setCurrentNode] = useState("");

  useEffect(() => {
    // Test connection to ComfyUI
    const testConnection = async () => {
      try {
        const response = await fetch("http://209.53.88.242:12628/object_info", {
          method: "GET",
          mode: "cors",
        });

        if (response.ok) {
          setIsConnected(true);

          // Try to get LoRA models
          const objectInfo = await response.json();
          const loraLoader = objectInfo.LoraLoaderModelOnly;
          if (
            loraLoader &&
            loraLoader.input &&
            loraLoader.input.required &&
            loraLoader.input.required.lora_name
          ) {
            setAvailableLoraModels(
              loraLoader.input.required.lora_name[0] || []
            );
          } else {
            // Fallback to mock data if structure is different
            setAvailableLoraModels([
              "2\\OF_BRI_V2.safetensors",
              "anime_style.safetensors",
              "realistic_portrait.safetensors",
            ]);
          }
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error("Connection test failed:", error);
        setIsConnected(false);
        // For development, use mock data
        setAvailableLoraModels([
          "2\\OF_BRI_V2.safetensors",
          "anime_style.safetensors",
          "realistic_portrait.safetensors",
        ]);
      }
    };

    testConnection();
  }, []);

  const handleGenerate = async (params: any) => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Build the workflow - ONLY include node definitions (FIXED)
      const workflow = {
        "1": {
          class_type: "EmptyLatentImage",
          inputs: {
            width: params.width,
            height: params.height,
            batch_size: params.batchSize,
          },
        },
        "2": {
          class_type: "CLIPTextEncode",
          inputs: {
            clip: ["5", 0],
            text: params.prompt,
          },
        },
        "3": {
          class_type: "VAEDecode",
          inputs: {
            samples: ["12", 0],
            vae: ["4", 0],
          },
        },
        "4": {
          class_type: "VAELoader",
          inputs: {
            vae_name: "runpod send 2\\ae.safetensors",
          },
        },
        "5": {
          class_type: "DualCLIPLoader",
          inputs: {
            clip_name1: "runpod send 2\\t5xxl_fp16.safetensors",
            clip_name2: "runpod send 2\\clip_l.safetensors",
            type: "flux",
          },
        },
        "6": {
          class_type: "UNETLoader",
          inputs: {
            unet_name: "flux_base_model\\flux1-dev.safetensors",
            weight_dtype: "fp8_e4m3fn",
          },
        },
        "7": {
          class_type: "FluxGuidance",
          inputs: {
            conditioning: ["2", 0],
            guidance: params.cfgScale,
          },
        },
        "9": {
          class_type: "ModelSamplingFlux",
          inputs: {
            model: ["14", 0],
            max_shift: 1.15,
            base_shift: 0.5,
            width: params.width,
            height: params.height,
          },
        },
        "10": {
          class_type: "ConditioningZeroOut",
          inputs: {
            conditioning: ["2", 0],
          },
        },
        "12": {
          class_type: "KSampler",
          inputs: {
            seed: params.seed || Math.floor(Math.random() * 1000000000),
            steps: params.steps,
            cfg: 1.0,
            sampler_name: "euler",
            scheduler: "simple",
            denoise: 1.0,
            model: ["9", 0],
            positive: ["7", 0],
            negative: ["10", 0],
            latent_image: ["1", 0],
          },
        },
        "13": {
          class_type: "SaveImage",
          inputs: {
            filename_prefix: "ComfyUI",
            images: ["3", 0],
          },
        },
        "14": {
          class_type: "LoraLoaderModelOnly",
          inputs: {
            model: ["6", 0],
            lora_name: params.selectedLoraModel,
            strength_model: params.loraStrength,
            strength_clip: params.loraStrength,
          },
        },
      };

      // Queue the prompt
      const clientId =
        Math.random().toString(36).substring(2) + Date.now().toString(36);

      console.log("Sending workflow:", JSON.stringify(workflow, null, 2));

      const queueResponse = await fetch("http://209.53.88.242:12628/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        body: JSON.stringify({
          prompt: workflow,
          client_id: clientId,
        }),
      });

      if (!queueResponse.ok) {
        const errorText = await queueResponse.text();
        console.error("Queue response error:", errorText);
        throw new Error(
          `Failed to queue prompt: ${queueResponse.statusText} - ${errorText}`
        );
      }

      const queueResult = await queueResponse.json();
      console.log("Queue result:", queueResult);
      const promptId = queueResult.prompt_id;

      // Poll for completion - adaptive timeout based on batch size
      let attempts = 0;
      // Base timeout of 5 minutes + 2 minutes per additional image in batch
      const baseTimeoutMinutes = 5;
      const additionalTimeoutPerImage = 2;
      const timeoutMinutes =
        baseTimeoutMinutes + (params.batchSize - 1) * additionalTimeoutPerImage;
      const maxAttempts = timeoutMinutes * 60; // Convert to seconds

      console.log(
        `Setting timeout to ${timeoutMinutes} minutes for batch size ${params.batchSize}`
      );

      while (attempts < maxAttempts) {
        setCurrentNode(
          `Checking status... (${Math.floor(attempts / 60)}:${(attempts % 60)
            .toString()
            .padStart(2, "0")} / ${timeoutMinutes}:00)`
        );
        setGenerationProgress(Math.min((attempts / maxAttempts) * 90, 90));

        try {
          const historyResponse = await fetch(
            `http://209.53.88.242:12628/history/${promptId}`,
            {
              method: "GET",
              mode: "cors",
            }
          );

          if (historyResponse.ok) {
            const history = await historyResponse.json();

            if (history[promptId]) {
              const execution = history[promptId];

              if (execution.status && execution.status.completed) {
                setCurrentNode("Retrieving images...");
                setGenerationProgress(95);

                // Get the generated images
                const imageUrls: string[] = [];

                if (execution.outputs) {
                  for (const nodeId in execution.outputs) {
                    const nodeOutput = execution.outputs[nodeId];
                    if (nodeOutput.images) {
                      for (const image of nodeOutput.images) {
                        const imageUrl = `http://209.53.88.242:12628/view?filename=${image.filename}&subfolder=${image.subfolder}&type=${image.type}`;
                        imageUrls.push(imageUrl);
                      }
                    }
                  }
                }

                setGenerationProgress(100);

                // Convert to GeneratedImage objects
                const generatedImages = imageUrls.map((url, index) => ({
                  id: `${promptId}_${index}`,
                  imageUrl: url,
                  filename: `generated_${promptId}_${index}.png`,
                  prompt: params.prompt,
                  negativePrompt: params.negativePrompt,
                  settings: {
                    model: "flux-dev",
                    sampler: "euler",
                    steps: params.steps,
                    cfgScale: params.cfgScale,
                    width: params.width,
                    height: params.height,
                    seed: params.seed,
                  },
                  timestamp: new Date(),
                }));

                return generatedImages;
              }

              if (execution.status && execution.status.status_str === "error") {
                throw new Error("Generation failed with error");
              }
            }
          }
        } catch (error) {
          console.warn("Status check failed:", error);
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      throw new Error("Generation timed out");
    } catch (error) {
      console.error("Generation error:", error);
      throw error;
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setCurrentNode("");
    }
  };

  return {
    handleGenerate,
    availableLoraModels,
    isConnected,
    isGenerating,
    generationProgress,
    currentNode,
  };
};

const ImageGenTab: React.FC = () => {
  // ComfyUI Integration
  const {
    handleGenerate: comfyUIGenerate,
    availableLoraModels,
    isConnected,
    isGenerating: comfyUIGenerating,
    generationProgress: comfyUIProgress,
    currentNode,
  } = useComfyUIGeneration();

  // Generation states
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("flux-dev");
  const [selectedSampler, setSelectedSampler] = useState("euler");
  const [selectedLoraModel, setSelectedLoraModel] = useState("");
  const [loraStrength, setLoraStrength] = useState(0.95);
  const [steps, setSteps] = useState(40);
  const [cfgScale, setCfgScale] = useState(3.5);
  const [width, setWidth] = useState(832);
  const [height, setHeight] = useState(1216);
  const [seed, setSeed] = useState("");
  const [batchSize, setBatchSize] = useState(1);

  // UI states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState("generate");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Data states
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [datasetItems, setDatasetItems] = useState<DatasetItem[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [promptGeneratorImages, setPromptGeneratorImages] = useState<
    GeneratedImage[]
  >([]);

  // Modal states
  const [selectedImageForModal, setSelectedImageForModal] =
    useState<GeneratedImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Folder states
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [selectedFolderForAdd, setSelectedFolderForAdd] = useState<
    string | null
  >(null);
  const [pendingVaultImages, setPendingVaultImages] = useState<MediaItem[]>([]);
  const [newQuickFolderName, setNewQuickFolderName] = useState("");

  // Set default LoRA model when available models load
  useEffect(() => {
    if (availableLoraModels.length > 0 && !selectedLoraModel) {
      setSelectedLoraModel(availableLoraModels[0]);
    }
  }, [availableLoraModels, selectedLoraModel]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const loadDatasetFromStorage = () => {
      try {
        const savedDataset = localStorage.getItem("dataset_items");
        if (savedDataset) {
          const parsedDataset = JSON.parse(savedDataset);
          const datasetWithDates = parsedDataset.map((item: any) => ({
            ...item,
            dateAdded: new Date(item.dateAdded),
          }));
          setDatasetItems(datasetWithDates);
          console.log(`Loaded ${datasetWithDates.length} items from storage`);
        }
      } catch (error) {
        console.error("Error loading dataset from storage:", error);
        localStorage.removeItem("dataset_items");
      }
    };

    const loadGeneratedImagesFromStorage = () => {
      try {
        const savedImages = localStorage.getItem("generated_images");
        if (savedImages) {
          const parsedImages = JSON.parse(savedImages);
          const imagesWithDates = parsedImages.map((img: any) => ({
            ...img,
            timestamp: new Date(img.timestamp),
            blobUrl: undefined, // Clear blob URLs as they're not valid across sessions
          }));
          setGeneratedImages(imagesWithDates);

          // Process images to create new blob URLs
          processGeneratedImages(imagesWithDates).then((processedImages) => {
            setGeneratedImages(processedImages);
          });

          console.log(
            `Loaded ${imagesWithDates.length} generated images from storage`
          );
        }
      } catch (error) {
        console.error("Error loading generated images from storage:", error);
        localStorage.removeItem("generated_images");
      }
    };

    const loadGeneratedVideosFromStorage = () => {
      try {
        const savedVideos = localStorage.getItem("generated_videos");
        if (savedVideos) {
          const parsedVideos = JSON.parse(savedVideos);
          const videosWithDates = parsedVideos.map((vid: any) => ({
            ...vid,
            timestamp: new Date(vid.timestamp),
            blobUrl: undefined, // Clear blob URLs as they're not valid across sessions
          }));
          setGeneratedVideos(videosWithDates);
          console.log(
            `Loaded ${videosWithDates.length} generated videos from storage`
          );
        }
      } catch (error) {
        console.error("Error loading generated videos from storage:", error);
        localStorage.removeItem("generated_videos");
      }
    };

    const loadFoldersFromStorage = () => {
      try {
        const savedFolders = localStorage.getItem("vault_folders");
        if (savedFolders) {
          const parsedFolders = JSON.parse(savedFolders);
          const foldersWithDates = parsedFolders.map((folder: any) => ({
            ...folder,
            createdAt: new Date(folder.createdAt),
          }));
          setFolders(foldersWithDates);
        }
      } catch (error) {
        console.error("Error loading folders from storage:", error);
        localStorage.removeItem("vault_folders");
      }
    };

    loadDatasetFromStorage();
    loadGeneratedImagesFromStorage();
    loadGeneratedVideosFromStorage();
    loadFoldersFromStorage();
  }, []);

  // Handle URL parameters for navigation and auth
  useEffect(() => {
    // Check for URL parameters on component mount
    const urlParams = new URLSearchParams(window.location.search);
    const subtab = urlParams.get("subtab");
    const error = urlParams.get("error");

    // Set the active subtab if specified
    if (
      subtab &&
      [
        "generate",
        "gallery",
        "dataset",
        "vault",
        "video",
        "prompt-generator",
      ].includes(subtab)
    ) {
      setActiveSubTab(subtab);
    }

    // Handle authentication errors
    if (error === "auth_failed") {
      setError("Authentication failed. Please try signing in again.");
    }

    // Optional: Clean the URL parameters after reading them
    if (subtab || error) {
      const url = new URL(window.location.href);
      url.searchParams.delete("subtab");
      url.searchParams.delete("error");
      // Keep other parameters like 'tab' and 'code' as they might be needed by other components
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (datasetItems.length > 0) {
      try {
        localStorage.setItem("dataset_items", JSON.stringify(datasetItems));
        console.log(`Saved ${datasetItems.length} dataset items to storage`);
      } catch (error) {
        console.error("Error saving dataset to storage:", error);
      }
    }
  }, [datasetItems]);

  useEffect(() => {
    if (generatedImages.length > 0) {
      try {
        // Remove blobUrl before saving as they're not persistent
        const imagesToSave = generatedImages.map(
          ({ blobUrl, ...image }) => image
        );
        localStorage.setItem("generated_images", JSON.stringify(imagesToSave));
        console.log(
          `Saved ${generatedImages.length} generated images to storage`
        );
      } catch (error) {
        console.error("Error saving generated images to storage:", error);
      }
    }
  }, [generatedImages]);

  useEffect(() => {
    if (generatedVideos.length > 0) {
      try {
        // Remove blobUrl before saving as they're not persistent
        const videosToSave = generatedVideos.map(
          ({ blobUrl, ...video }) => video
        );
        localStorage.setItem("generated_videos", JSON.stringify(videosToSave));
        console.log(
          `Saved ${generatedVideos.length} generated videos to storage`
        );
      } catch (error) {
        console.error("Error saving generated videos to storage:", error);
      }
    }
  }, [generatedVideos]);

  useEffect(() => {
    if (folders.length > 0) {
      try {
        localStorage.setItem("vault_folders", JSON.stringify(folders));
      } catch (error) {
        console.error("Error saving folders to storage:", error);
      }
    }
  }, [folders]);

  // Available models for Flux
  const availableModels = ["flux-dev", "flux-schnell"];

  const availableSamplers = [
    "euler",
    "euler_ancestral",
    "dpm_2m",
    "dpm_2m_karras",
  ];

  // Size presets for Flux
  const presetSizes = [
    { name: "Portrait", width: 832, height: 1216 },
    { name: "Landscape", width: 1216, height: 832 },
    { name: "Square", width: 1024, height: 1024 },
    { name: "Wide", width: 1344, height: 768 },
  ];

  const categories = [
    "all",
    "portraits",
    "landscapes",
    "objects",
    "anime",
    "realistic",
    "abstract",
    "concept-art",
  ];

  // Sidebar navigation items - UPDATED to include combined gallery count
  const navigationItems = [
    {
      id: "generate",
      label: "Image Generation",
      icon: Image,
      description: "Generate AI images",
    },
    {
      id: "video",
      label: "Video Generation",
      icon: Video,
      description: "Generate AI videos",
    },
    {
      id: "gallery",
      label: "Gallery",
      icon: Grid,
      description: "View all AI generated media",
      count: generatedImages.length + generatedVideos.length, // Combined count
    },
    {
      id: "prompt-generator",
      label: "Prompt Generator",
      icon: Wand2,
      description: "Analyze images for prompts",
      count: promptGeneratorImages.length,
    },
    {
      id: "dataset",
      label: "Dataset",
      icon: Database,
      description: "Browse Google Drive",
    },
    {
      id: "vault",
      label: "Vault",
      icon: FolderOpen,
      description: "Manage collection",
      count: datasetItems.length,
    },
  ];

  // Clear all data function (useful for testing) - UPDATED
  const clearAllData = () => {
    setDatasetItems([]);
    setGeneratedImages([]);
    setGeneratedVideos([]); // Added this line
    setFolders([]);
    localStorage.removeItem("dataset_items");
    localStorage.removeItem("generated_images");
    localStorage.removeItem("generated_videos"); // Added this line
    localStorage.removeItem("vault_folders");
    console.log("Cleared all data");
  };

  // Function to fetch image as blob and create object URL for CORS handling
  const fetchImageAsBlob = async (imageUrl: string): Promise<string> => {
    try {
      const response = await fetch(imageUrl, {
        method: "GET",
        mode: "cors",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Error fetching image as blob:", error);
      return imageUrl; // Fallback to original URL
    }
  };

  // Function to process generated images and create blob URLs
  const processGeneratedImages = async (
    images: GeneratedImage[]
  ): Promise<GeneratedImage[]> => {
    const processedImages = await Promise.all(
      images.map(async (image) => {
        try {
          const blobUrl = await fetchImageAsBlob(image.imageUrl);
          return { ...image, blobUrl };
        } catch (error) {
          console.error(`Failed to process image ${image.id}:`, error);
          return image; // Return original if processing fails
        }
      })
    );
    return processedImages;
  };

  // Updated generation function using ComfyUI
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    if (!selectedLoraModel) {
      setError("Please select a LoRA model");
      return;
    }

    if (!isConnected) {
      setError("Not connected to ComfyUI. Please check your connection.");
      return;
    }

    setError("");

    try {
      const generationParams = {
        prompt,
        negativePrompt,
        batchSize,
        selectedLoraModel,
        loraStrength,
        steps,
        cfgScale,
        width,
        height,
        seed: seed ? parseInt(seed) : undefined,
      };

      const newImages = await comfyUIGenerate(generationParams);

      // Process images to create blob URLs for proper display
      console.log("Processing images for display...");
      const processedImages = await processGeneratedImages(newImages);

      setGeneratedImages((prev) => [...processedImages, ...prev]);
    } catch (error) {
      console.error("Generation failed:", error);
      setError(
        `Generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Dataset management functions
  const addToDataset = (images: GeneratedImage[]) => {
    const newDatasetItems: DatasetItem[] = images.map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      filename: img.filename,
      tags: extractTagsFromPrompt(img.prompt),
      category: detectCategory(img.prompt),
      description: img.prompt,
      source: "generated",
      dateAdded: new Date(),
    }));

    setDatasetItems((prev) => [...newDatasetItems, ...prev]);
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

  // Updated addToVault function with folder selection - UPDATED to handle both images and videos
  const addToVault = (items: MediaItem[]) => {
    setPendingVaultImages(items);
    setShowFolderDialog(true);
  };

  // Complete the vault addition after folder selection - UPDATED
  const completeVaultAddition = () => {
    const newDatasetItems: DatasetItem[] = pendingVaultImages.map((item) => ({
      id: item.id,
      imageUrl: "imageUrl" in item ? item.imageUrl : item.videoUrl,
      filename: item.filename,
      tags: extractTagsFromPrompt(item.prompt),
      category: detectCategory(item.prompt),
      description: item.prompt,
      source: "generated",
      dateAdded: new Date(),
      folderId: selectedFolderForAdd || undefined,
    }));

    setDatasetItems((prev) => [...newDatasetItems, ...prev]);

    // Mark items as in vault
    const imageIds = pendingVaultImages
      .filter((item) => "imageUrl" in item)
      .map((item) => item.id);
    const videoIds = pendingVaultImages
      .filter((item) => "videoUrl" in item)
      .map((item) => item.id);

    if (imageIds.length > 0) {
      setGeneratedImages((prev) =>
        prev.map((img) =>
          imageIds.includes(img.id) ? { ...img, isInVault: true } : img
        )
      );
    }

    if (videoIds.length > 0) {
      setGeneratedVideos((prev) =>
        prev.map((vid) =>
          videoIds.includes(vid.id) ? { ...vid, isInVault: true } : vid
        )
      );
    }

    // Reset dialog state
    setShowFolderDialog(false);
    setSelectedFolderForAdd(null);
    setPendingVaultImages([]);
    setNewQuickFolderName("");
  };

  // Cancel vault addition
  const cancelVaultAddition = () => {
    setShowFolderDialog(false);
    setSelectedFolderForAdd(null);
    setPendingVaultImages([]);
    setNewQuickFolderName("");
  };

  const toggleBookmark = (imageId: string) => {
    setGeneratedImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, isBookmarked: !img.isBookmarked } : img
      )
    );
  };

  const downloadImage = async (image: GeneratedImage) => {
    try {
      // Use blob URL if available, otherwise fetch the image
      let downloadUrl = image.blobUrl;

      if (!downloadUrl) {
        // Fetch the image as blob if we don't have a blob URL
        const response = await fetch(image.imageUrl, {
          method: "GET",
          mode: "cors",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const blob = await response.blob();
        downloadUrl = URL.createObjectURL(blob);
      }

      // Create download link
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = image.filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL if we created it
      if (!image.blobUrl && downloadUrl) {
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
      }
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open in new tab
      window.open(image.imageUrl, "_blank");
    }
  };

  // Utility functions
  const extractTagsFromPrompt = (prompt: string): string[] => {
    // Simple tag extraction logic
    const commonTags = [
      "portrait",
      "landscape",
      "anime",
      "realistic",
      "abstract",
      "detailed",
      "colorful",
    ];
    return commonTags.filter((tag) =>
      prompt.toLowerCase().includes(tag.toLowerCase())
    );
  };

  const detectCategory = (prompt: string): string => {
    const promptLower = prompt.toLowerCase();
    if (promptLower.includes("portrait") || promptLower.includes("face"))
      return "portraits";
    if (promptLower.includes("landscape") || promptLower.includes("scenery"))
      return "landscapes";
    if (promptLower.includes("anime") || promptLower.includes("manga"))
      return "anime";
    if (promptLower.includes("realistic") || promptLower.includes("photo"))
      return "realistic";
    return "objects";
  };

  const getSelectedImages = (): GeneratedImage[] => {
    return generatedImages.filter((img) => selectedImages.has(img.id));
  };

  // Function to send selected items to prompt generator - UPDATED
  const sendToPromptGenerator = (items: MediaItem[]) => {
    if (items.length === 0) {
      setError("Please select items to send to prompt generator");
      return;
    }

    // Only send images to prompt generator (videos are not supported for prompt analysis)
    const imageItems = items.filter(
      (item) => "imageUrl" in item
    ) as GeneratedImage[];

    if (imageItems.length === 0) {
      setError(
        "No images selected. Only images can be sent to prompt generator."
      );
      return;
    }

    // Add to prompt generator images (avoiding duplicates)
    setPromptGeneratorImages((prev) => {
      const existingIds = new Set(prev.map((img) => img.id));
      const newImages = imageItems.filter((img) => !existingIds.has(img.id));
      return [...prev, ...newImages];
    });

    // Switch to prompt generator tab
    setActiveSubTab("prompt-generator");
    setError(""); // Clear any previous errors
  };

  // Function to clear prompt generator images
  const clearPromptGeneratorImages = () => {
    setPromptGeneratorImages([]);
  };

  // Handle image selection
  const toggleImageSelection = (imageId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering modal
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  // Handle image click for modal
  const handleImageClick = (image: GeneratedImage) => {
    setSelectedImageForModal(image);
    setShowImageModal(true);
  };

  // Close modal
  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImageForModal(null);
  };

  const filteredImages = generatedImages.filter((img) => {
    const matchesSearch =
      img.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      detectCategory(img.prompt) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Use ComfyUI state for generation status
  const actuallyGenerating = comfyUIGenerating;
  const actualProgress = comfyUIProgress;

  // Custom Image Component to handle CORS issues
  const ComfyUIImage: React.FC<{
    image: GeneratedImage;
    className?: string;
    alt: string;
  }> = ({ image, className, alt }) => {
    const [imgSrc, setImgSrc] = useState<string>(
      image.blobUrl || image.imageUrl
    );
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      setImgSrc(image.blobUrl || image.imageUrl);
      setIsLoading(true);
      setHasError(false);
    }, [image.blobUrl, image.imageUrl]);

    const handleImageLoad = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const handleImageError = async () => {
      setIsLoading(false);

      // If we haven't tried the blob URL yet, try to fetch it
      if (!image.blobUrl && !hasError) {
        try {
          console.log("Image load failed, attempting to fetch as blob...");
          const blobUrl = await fetchImageAsBlob(image.imageUrl);
          setImgSrc(blobUrl);
          setHasError(false);
          return;
        } catch (error) {
          console.error("Failed to fetch image as blob:", error);
        }
      }

      setHasError(true);
    };

    if (hasError) {
      return (
        <div
          className={`${className} bg-gray-800 flex items-center justify-center`}
        >
          <div className="text-center text-gray-400">
            <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Failed to load</p>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                setImgSrc(image.imageUrl);
              }}
              className="text-blue-400 text-xs underline mt-1"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={`relative ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
        <img
          src={imgSrc}
          alt={alt}
          className="w-full h-full object-contain bg-black/20"
          onLoad={handleImageLoad}
          onError={handleImageError}
          crossOrigin="anonymous"
        />
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div
        className={`bg-black/30 backdrop-blur-md border-r border-white/10 transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-64"
        } flex-shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h2 className="text-white text-lg font-semibold">AI Studio</h2>
                <p className="text-gray-400 text-sm">Content Generation Hub</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <Menu size={16} />
            </Button>
          </div>
        </div>

        {/* ComfyUI Connection Status */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center space-x-2 mb-2">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm">
                    ComfyUI Connected
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm">ComfyUI Offline</span>
                </>
              )}
            </div>
            <p className="text-gray-400 text-xs">
              LoRA Models: {availableLoraModels.length}
            </p>
          </div>
        )}

        {/* Debug Info - UPDATED */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-white/10">
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-2">
                Dataset: {datasetItems.length} | Images:{" "}
                {generatedImages.length} | Videos: {generatedVideos.length}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-red-900/20 border-red-500/30 text-red-300 text-xs"
                onClick={clearAllData}
              >
                Clear All Data
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSubTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id)}
                className={`w-full flex items-center ${
                  sidebarCollapsed
                    ? "justify-center px-2"
                    : "justify-between px-4"
                } py-3 mb-2 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? "bg-purple-600/20 border border-purple-400/30 text-purple-300"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center">
                  <IconComponent
                    size={20}
                    className={`${sidebarCollapsed ? "" : "mr-3"} ${
                      isActive ? "text-purple-400" : ""
                    }`}
                  />
                  {!sidebarCollapsed && (
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-60">
                        {item.description}
                      </div>
                    </div>
                  )}
                </div>

                {!sidebarCollapsed && (
                  <div className="flex items-center space-x-2">
                    {item.count !== undefined && item.count > 0 && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          isActive
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-gray-700/50 text-gray-400"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight size={16} className="text-purple-400" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {!sidebarCollapsed && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black/40 rounded-lg p-3 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-400" : "bg-red-400"
                  }`}
                ></div>
                <span
                  className={`${
                    isConnected ? "text-green-400" : "text-red-400"
                  } text-sm`}
                >
                  {isConnected ? "Online" : "Offline"}
                </span>
              </div>
              <p className="text-gray-400 text-xs">
                {isConnected ? "ComfyUI operational" : "ComfyUI disconnected"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Header */}
        <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white text-xl font-semibold">
                {
                  navigationItems.find((item) => item.id === activeSubTab)
                    ?.label
                }
              </h1>
              <p className="text-gray-400 text-sm">
                {
                  navigationItems.find((item) => item.id === activeSubTab)
                    ?.description
                }
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {activeSubTab === "generate" && actuallyGenerating && (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span className="text-purple-300 text-sm">
                    {actualProgress}%
                  </span>
                  {currentNode && (
                    <span className="text-gray-400 text-xs">
                      ({currentNode})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Folder Selection Dialog */}
        {showFolderDialog && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-white text-lg font-semibold mb-4">
                Choose Folder for {pendingVaultImages.length} item
                {pendingVaultImages.length > 1 ? "s" : ""}
              </h3>

              <div className="space-y-4">
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
                                  folders.find((f) => f.id === folder.parentId)
                                    ?.name
                                }
                                )
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* Quick folder creation */}
                <div className="border-t border-white/10 pt-4">
                  <p className="text-gray-400 text-sm mb-2">
                    Or create a new folder:
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

                <div className="flex space-x-3">
                  <Button
                    onClick={completeVaultAddition}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check size={16} className="mr-2" />
                    Add to{" "}
                    {selectedFolderForAdd
                      ? folders.find((f) => f.id === selectedFolderForAdd)?.name
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Generate Tab Content */}
          {activeSubTab === "generate" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel - Generation Controls */}
              <Card className="lg:col-span-2 bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white">
                    Flux Dev + LoRA Generation
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Create high-quality images using Flux Dev with custom LoRA
                    models
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Prompt Section */}
                  <div className="space-y-4">
                    <div>
                      <Label
                        htmlFor="prompt"
                        className="text-gray-300 mb-2 block"
                      >
                        Prompt
                      </Label>
                      <Textarea
                        id="prompt"
                        placeholder="Describe the image you want to generate..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="bg-black/60 border-white/10 text-white rounded-lg min-h-24"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="negative-prompt"
                        className="text-gray-300 mb-2 block"
                      >
                        Negative Prompt (Optional)
                      </Label>
                      <Textarea
                        id="negative-prompt"
                        placeholder="What to avoid in the image..."
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        className="bg-black/60 border-white/10 text-white rounded-lg min-h-20"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* LoRA Model Selection */}
                  <div>
                    <Label className="text-gray-300 mb-2 block">
                      LoRA Model
                    </Label>
                    <Select
                      value={selectedLoraModel}
                      onValueChange={setSelectedLoraModel}
                      disabled={
                        !isConnected || availableLoraModels.length === 0
                      }
                    >
                      <SelectTrigger className="bg-black/60 border-white/10 text-white">
                        <SelectValue
                          placeholder={
                            isConnected
                              ? availableLoraModels.length === 0
                                ? "No LoRA models found"
                                : "Select a LoRA model"
                              : "Not connected to ComfyUI"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/10 text-white">
                        {availableLoraModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model.replace(/\.(safetensors|pt|ckpt)$/, "")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* LoRA Strength */}
                  <div>
                    <Label className="text-gray-300 mb-2 block">
                      LoRA Strength: {loraStrength}
                    </Label>
                    <Slider
                      value={[loraStrength]}
                      min={0}
                      max={2}
                      step={0.05}
                      onValueChange={(value) => setLoraStrength(value[0])}
                      className="py-2"
                    />
                  </div>

                  {/* Model & Sampler */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300 mb-2 block">Model</Label>
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                      >
                        <SelectTrigger className="bg-black/60 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/10 text-white">
                          {availableModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model
                                .replace(/-/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300 mb-2 block">
                        Sampler
                      </Label>
                      <Select
                        value={selectedSampler}
                        onValueChange={setSelectedSampler}
                      >
                        <SelectTrigger className="bg-black/60 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/10 text-white">
                          {availableSamplers.map((sampler) => (
                            <SelectItem key={sampler} value={sampler}>
                              {sampler.replace(/_/g, " ").toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Size Presets */}
                  <div>
                    <Label className="text-gray-300 mb-2 block">
                      Size Presets
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {presetSizes.map((preset) => (
                        <Button
                          key={preset.name}
                          variant="outline"
                          size="sm"
                          className={`bg-black/60 border-white/10 text-white hover:bg-white/10 ${
                            width === preset.width && height === preset.height
                              ? "bg-purple-600/30 border-purple-400"
                              : ""
                          }`}
                          onClick={() => {
                            setWidth(preset.width);
                            setHeight(preset.height);
                          }}
                        >
                          {preset.name}
                          <br />
                          <span className="text-xs opacity-60">
                            {preset.width}×{preset.height}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300 mb-2 block">
                          Steps: {steps}
                        </Label>
                        <Slider
                          value={[steps]}
                          min={20}
                          max={100}
                          step={1}
                          onValueChange={(value) => setSteps(value[0])}
                          className="py-2"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-300 mb-2 block">
                          CFG Scale: {cfgScale}
                        </Label>
                        <Slider
                          value={[cfgScale]}
                          min={1}
                          max={10}
                          step={0.1}
                          onValueChange={(value) => setCfgScale(value[0])}
                          className="py-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-gray-300 mb-2 block">
                          Seed (Optional)
                        </Label>
                        <Input
                          placeholder="Random"
                          value={seed}
                          onChange={(e) => setSeed(e.target.value)}
                          className="bg-black/60 border-white/10 text-white"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-300 mb-2 block">
                          Batch Size
                        </Label>
                        <Select
                          value={batchSize.toString()}
                          onValueChange={(value) =>
                            setBatchSize(parseInt(value))
                          }
                        >
                          <SelectTrigger className="bg-black/60 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 border-white/10 text-white">
                            {Array.from({ length: 15 }, (_, i) => i + 1).map(
                              (size) => (
                                <SelectItem key={size} value={size.toString()}>
                                  {size} {size === 1 ? "image" : "images"}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          className="w-full bg-black/60 border-white/10 text-white hover:bg-white/10"
                          onClick={() =>
                            setSeed(
                              Math.floor(Math.random() * 1000000).toString()
                            )
                          }
                        >
                          <RefreshCw size={16} className="mr-2" />
                          Random
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Connection Status Alert */}
                  {!isConnected && (
                    <Alert className="bg-red-900/20 border-red-500/30 text-red-200">
                      <WifiOff className="h-4 w-4" />
                      <AlertTitle>Connection Issue</AlertTitle>
                      <AlertDescription>
                        Cannot connect to ComfyUI. Please check your RunPod
                        instance is running and accessible.
                      </AlertDescription>
                    </Alert>
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
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg"
                    onClick={handleGenerate}
                    disabled={
                      actuallyGenerating ||
                      !prompt.trim() ||
                      !isConnected ||
                      !selectedLoraModel
                    }
                  >
                    {actuallyGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating... {actualProgress}%
                        {currentNode && (
                          <span className="ml-1">({currentNode})</span>
                        )}
                      </>
                    ) : (
                      <>
                        <Image className="w-4 h-4 mr-2" />
                        Generate{" "}
                        {batchSize > 1 ? `${batchSize} Images` : "Image"}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              {/* Right Panel - Quick Preview */}
              <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white">
                    Latest Generation
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Preview and manage your most recent images
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {actuallyGenerating ? (
                    <div className="aspect-square bg-black/50 rounded-lg border border-white/10 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-400" />
                        <p className="text-gray-300">Generating...</p>
                        <p className="text-sm text-gray-400">
                          {actualProgress}%
                        </p>
                        {currentNode && (
                          <p className="text-xs text-gray-500 mt-1">
                            {currentNode}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : generatedImages.length > 0 ? (
                    <div className="space-y-4">
                      <div className="aspect-square bg-black/50 rounded-lg border border-white/10 overflow-hidden">
                        <ComfyUIImage
                          image={generatedImages[0]}
                          alt="Latest generation"
                          className="aspect-square"
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {generatedImages[0].prompt}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/5 border-white/10 hover:bg-white/10"
                            onClick={async () =>
                              await downloadImage(generatedImages[0])
                            }
                          >
                            <Download size={14} className="mr-1" />
                            Download
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/5 border-white/10 hover:bg-white/10"
                            onClick={() =>
                              toggleBookmark(generatedImages[0].id)
                            }
                          >
                            <Star
                              size={14}
                              className={`mr-1 ${
                                generatedImages[0].isBookmarked
                                  ? "fill-yellow-400 text-yellow-400"
                                  : ""
                              }`}
                            />
                            Bookmark
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square bg-black/50 rounded-lg border border-white/10 flex items-center justify-center">
                      <div className="text-center">
                        <Image className="w-12 h-12 mx-auto mb-4 text-gray-500 opacity-50" />
                        <p className="text-gray-300">No images generated yet</p>
                        <p className="text-sm text-gray-400">
                          {isConnected
                            ? "Create your first image above"
                            : "Connect to ComfyUI to start generating"}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Gallery Tab Content - UPDATED to use Combined Gallery */}
          {activeSubTab === "gallery" && (
            <CombinedGallery
              generatedImages={generatedImages.map((img) => ({
                ...img,
                type: "image" as const,
              }))}
              setGeneratedImages={setGeneratedImages}
              generatedVideos={generatedVideos.map((vid) => ({
                ...vid,
                type: "video" as const,
              }))}
              setGeneratedVideos={setGeneratedVideos}
              onSendToPromptGenerator={sendToPromptGenerator}
              onAddToVault={addToVault}
            />
          )}

          {/* Video Tab Content */}
          {activeSubTab === "video" && (
            <VideoTab
              generatedVideos={generatedVideos}
              setGeneratedVideos={setGeneratedVideos}
            />
          )}

          {/* Prompt Generator Tab Content */}
          {activeSubTab === "prompt-generator" && (
            <PromptGeneratorTab
              receivedImages={promptGeneratorImages}
              onClearReceivedImages={clearPromptGeneratorImages}
            />
          )}

          {/* Dataset Tab Content */}
          {activeSubTab === "dataset" && (
            <DatasetTab
              datasetItems={datasetItems}
              setDatasetItems={setDatasetItems}
              generatedImages={generatedImages}
              folders={folders}
              setFolders={setFolders}
            />
          )}

          {/* Vault Tab Content */}
          {activeSubTab === "vault" && (
            <VaultTab
              datasetItems={datasetItems}
              setDatasetItems={setDatasetItems}
              folders={folders}
              setFolders={setFolders}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenTab;
