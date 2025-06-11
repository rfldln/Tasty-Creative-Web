import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Upload,
  Send,
  Loader2,
  Image as ImageIcon,
  X,
  Copy,
  Download,
  RefreshCw,
  Settings,
  Zap,
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
  Clock,
  Sparkles,
  Brain,
  Target,
  Activity,
  Trash2,
  FileDown,
  Plus,
  Wand2,
} from "lucide-react";

interface GeneratedImage {
  id: string;
  imageUrl: string;
  filename: string;
  prompt: string;
  negativePrompt?: string;
  settings: any;
  timestamp: Date;
  isBookmarked?: boolean;
  isInVault?: boolean;
  blobUrl?: string;
}

interface PromptAnalysisResult {
  id: string;
  imageId: string;
  originalPrompt?: string;
  generatedPrompt: string;
  confidence: number;
  tags: string[];
  style: string;
  mood: string;
  timestamp: Date;
  processingTime: number;
  requestId?: string;
}

interface PendingRequest {
  requestId: string;
  filename: string;
  startTime: Date;
  timeout?: NodeJS.Timeout;
}

interface PromptGeneratorProps {
  receivedImages: GeneratedImage[];
  onClearReceivedImages: () => void;
}

const PromptGeneratorTab: React.FC<PromptGeneratorProps> = ({
  receivedImages,
  onClearReceivedImages,
}) => {
  // State management
  const [webhookUrl, setWebhookUrl] = useState(
    "https://n8n.tastycreative.xyz/webhook/80fb6fdb-95b6-400d-b3a6-ea6d87a30a5e"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentProcessingImage, setCurrentProcessingImage] =
    useState<string>("");
  const [results, setResults] = useState<PromptAnalysisResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  // Refs for polling management
  const lastCheckTimestamp = useRef(0);
  const activeIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load saved data on mount
  useEffect(() => {
    const savedResults = localStorage.getItem("prompt_analysis_results");
    const savedWebhookUrl = localStorage.getItem("n8n_webhook_url");

    if (savedResults) {
      try {
        const parsedResults = JSON.parse(savedResults);
        const resultsWithDates = parsedResults.map((result: any) => ({
          ...result,
          timestamp: new Date(result.timestamp),
        }));
        setResults(resultsWithDates);
      } catch (error) {
        console.error("Error loading saved results:", error);
      }
    }

    if (savedWebhookUrl) {
      setWebhookUrl(savedWebhookUrl);
    }

    // Cleanup on unmount
    return () => {
      stopAllChecking();
    };
  }, []);

  // Save results to localStorage
  useEffect(() => {
    if (results.length > 0) {
      localStorage.setItem("prompt_analysis_results", JSON.stringify(results));
    }
  }, [results]);

  // Save webhook URL
  useEffect(() => {
    localStorage.setItem("n8n_webhook_url", webhookUrl);
  }, [webhookUrl]);

  // Remove pending request
  const removePendingRequest = (requestId: string) => {
    console.log("🗑️ Removing pending request:", requestId);
    setPendingRequests((prev) =>
      prev.filter((req) => req.requestId !== requestId)
    );

    // Clear any associated interval
    const interval = activeIntervals.current.get(requestId);
    if (interval) {
      clearInterval(interval);
      activeIntervals.current.delete(requestId);
    }

    // Clear any timeout
    const timeout = pendingTimeouts.current.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      pendingTimeouts.current.delete(requestId);
    }
  };

  // Polling functions
  const fetchWebhookData = async (requestId: string) => {
    console.log("🔍 Fetching webhook data for requestId:", requestId);
    try {
      const response = await fetch(`/api/webhook?requestId=${requestId}`);
      console.log("📡 Response status:", response.status, response.statusText);

      if (!response.ok) {
        console.error("❌ Webhook data request failed:", response.statusText);
        return null;
      }

      const result = await response.json();
      console.log("📦 Raw result:", result);

      if (!result || !result.data) {
        console.warn(
          "⚠️ No data found for requestId:",
          requestId,
          "Result:",
          result
        );
        return null;
      }

      console.log(
        "🔍 Checking timestamp:",
        result.timestamp,
        "vs lastCheck:",
        lastCheckTimestamp.current
      );

      if (result.timestamp > lastCheckTimestamp.current) {
        console.log("✅ New data found! Returning:", result.data);
        lastCheckTimestamp.current = result.timestamp;
        return { data: result.data, requestId };
      }

      console.log("⏳ No new data (timestamp not newer)");
      return null;
    } catch (error) {
      console.error("💥 Error fetching webhook data:", error);
      return null;
    }
  };

  const startChecking = (requestId: string, filename: string) => {
    console.log("🔄 Starting polling for requestId:", requestId);

    // Set up interval for this specific request
    const interval = setInterval(async () => {
      console.log("🔄 Polling for requestId:", requestId);
      const result = await fetchWebhookData(requestId);

      if (result && result.data) {
        console.log(
          "🎯 Got data for requestId:",
          requestId,
          "Data:",
          result.data
        );

        // Stop checking for this request
        removePendingRequest(requestId);

        // Process the webhook response
        handleWebhookResponse(requestId, result.data, filename);
      }
    }, 2000);

    activeIntervals.current.set(requestId, interval);

    // Set timeout for this request (2 minutes)
    const timeout = setTimeout(() => {
      console.log("⏰ Request timed out:", requestId);
      removePendingRequest(requestId);
      handleRequestTimeout(requestId, filename);
    }, 120000); // 2 minutes

    pendingTimeouts.current.set(requestId, timeout);
  };

  const stopAllChecking = () => {
    console.log("🛑 Stopping all checking");

    // Clear all intervals
    activeIntervals.current.forEach((interval) => clearInterval(interval));
    activeIntervals.current.clear();

    // Clear all timeouts
    pendingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    pendingTimeouts.current.clear();

    setPendingRequests([]);
  };

  const handleWebhookResponse = (
    requestId: string,
    webhookResponse: any,
    filename: string
  ) => {
    console.log(
      "🎯 Handling webhook response for requestId:",
      requestId,
      "Response:",
      webhookResponse
    );

    const result: PromptAnalysisResult = {
      id: `analysis_${Date.now()}_${requestId}`,
      imageId: requestId,
      generatedPrompt: webhookResponse.prompt || "No prompt generated",
      confidence: webhookResponse.confidence || 0,
      tags: webhookResponse.tags || [],
      style: webhookResponse.style || "Unknown",
      mood: webhookResponse.mood || "Unknown",
      timestamp: new Date(),
      processingTime: webhookResponse.processingTime || 0,
      requestId: requestId,
    };

    console.log("💾 Adding result to state:", result);
    setResults((prev) => [result, ...prev]);
    setSuccess(`Successfully processed: ${filename}`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleRequestTimeout = (requestId: string, filename: string) => {
    console.log("⏰ Handling timeout for requestId:", requestId);
    setError(`Request timed out for: ${filename}`);
    setTimeout(() => setError(""), 5000);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length !== files.length) {
      setError("Only image files are allowed");
      return;
    }

    setSelectedFiles((prev) => [...prev, ...imageFiles]);
    setError("");
  };

  // Remove uploaded file
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Convert image to base64
  const imageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Convert image URL to base64
  const urlToBase64 = async (imageUrl: string): Promise<string> => {
    try {
      const response = await fetch(imageUrl, {
        mode: "cors",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting URL to base64:", error);
      throw error;
    }
  };

  // Send image to n8n webhook with UUID
  const sendToWebhook = async (
    imageData: string,
    filename: string,
    originalPrompt?: string
  ): Promise<string> => {
    // Generate unique requestId for each request
    const requestId = uuidv4();

    console.log(
      "📤 Sending to webhook with requestId:",
      requestId,
      "filename:",
      filename
    );

    const payload = {
      requestId: requestId,
      image: imageData,
      filename: filename,
      originalPrompt: originalPrompt || "",
      timestamp: new Date().toISOString(),
    };

    console.log("📋 Webhook payload:", {
      requestId,
      filename,
      originalPrompt,
      timestamp: payload.timestamp,
      imageDataLength: imageData.length,
    });

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("📡 Webhook response:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.statusText}`);
    }

    // Add to pending requests
    const pendingRequest: PendingRequest = {
      requestId,
      filename,
      startTime: new Date(),
    };

    console.log("⏳ Adding to pending requests:", pendingRequest);
    setPendingRequests((prev) => [...prev, pendingRequest]);

    // Start polling for this request
    startChecking(requestId, filename);

    return requestId;
  };

  // Process uploaded files
  const processUploadedFiles = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select files to upload");
      return;
    }

    if (!webhookUrl.trim()) {
      setError("Please enter a valid webhook URL");
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");
    setProcessingProgress(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setCurrentProcessingImage(file.name);
        setProcessingProgress(((i + 1) / selectedFiles.length) * 100);

        try {
          const base64Data = await imageToBase64(file);
          await sendToWebhook(base64Data, file.name);
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          setError(
            `Failed to process ${file.name}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      setSuccess(
        `Submitted ${selectedFiles.length} images for processing. Check results below.`
      );
      setSelectedFiles([]);
    } catch (error) {
      console.error("Processing error:", error);
      setError(
        `Processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsProcessing(false);
      setCurrentProcessingImage("");
      setProcessingProgress(0);
    }
  };

  // Process received images from gallery
  const processReceivedImages = async () => {
    if (receivedImages.length === 0) {
      setError("No images received from gallery");
      return;
    }

    if (!webhookUrl.trim()) {
      setError("Please enter a valid webhook URL");
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");
    setProcessingProgress(0);

    try {
      for (let i = 0; i < receivedImages.length; i++) {
        const image = receivedImages[i];
        setCurrentProcessingImage(image.filename);
        setProcessingProgress(((i + 1) / receivedImages.length) * 100);

        try {
          const imageUrl = image.blobUrl || image.imageUrl;
          const base64Data = await urlToBase64(imageUrl);
          await sendToWebhook(base64Data, image.filename, image.prompt);
        } catch (error) {
          console.error(`Error processing ${image.filename}:`, error);
          setError(
            `Failed to process ${image.filename}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      setSuccess(
        `Submitted ${receivedImages.length} images for processing. Check results below.`
      );
      onClearReceivedImages();
    } catch (error) {
      console.error("Processing error:", error);
      setError(
        `Processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsProcessing(false);
      setCurrentProcessingImage("");
      setProcessingProgress(0);
    }
  };

  // Copy prompt to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess("Prompt copied to clipboard!");
      setTimeout(() => setSuccess(""), 2000);
    });
  };

  // Clear all results
  const clearAllResults = () => {
    setResults([]);
    localStorage.removeItem("prompt_analysis_results");
    setSuccess("All results cleared");
    setTimeout(() => setSuccess(""), 2000);
  };

  // Export results
  const exportResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `prompt_analysis_results_${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <Brain className="text-purple-400" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                AI Prompt Generator
              </h1>
              <p className="text-gray-300">
                Analyze images and generate detailed prompts using AI
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">
                {results.length}
              </p>
              <p className="text-xs text-gray-400">Analyzed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">
                {pendingRequests.length}
              </p>
              <p className="text-xs text-gray-400">Processing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Requests Status */}
      {pendingRequests.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 backdrop-blur-md border-amber-500/30 rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Activity className="text-amber-400" size={20} />
                <div>
                  <CardTitle className="text-amber-300">
                    Processing Queue ({pendingRequests.length})
                  </CardTitle>
                  <CardDescription className="text-amber-200/70">
                    AI is analyzing your images...
                  </CardDescription>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={stopAllChecking}
                className="bg-red-900/30 border-red-500/30 text-red-300 hover:bg-red-900/50"
              >
                <X size={16} className="mr-1" />
                Cancel All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="flex items-center justify-between bg-black/30 p-3 rounded-lg border border-white/10"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-600/20 rounded">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    </div>
                    <div>
                      <p className="text-amber-200 font-medium">
                        {req.filename}
                      </p>
                      <p className="text-amber-300/70 text-xs">
                        {Math.round(
                          (Date.now() - req.startTime.getTime()) / 1000
                        )}
                        s elapsed
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePendingRequest(req.requestId)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gallery Images */}
        <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-600/20 rounded">
                  <ImageIcon className="text-purple-400" size={20} />
                </div>
                <div>
                  <CardTitle className="text-white">Gallery Images</CardTitle>
                  <CardDescription className="text-gray-400">
                    Images sent from your gallery
                  </CardDescription>
                </div>
              </div>
              {receivedImages.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="bg-purple-600/30 text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                    {receivedImages.length} images
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {receivedImages.length > 0 ? (
              <div className="space-y-4">
                {/* Image Grid */}
                <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto bg-black/20 rounded-lg p-3">
                  {receivedImages.map((image, index) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.blobUrl || image.imageUrl}
                        alt={image.filename}
                        className="w-full aspect-square object-cover rounded-lg border border-white/10 transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Eye size={20} className="text-white" />
                      </div>
                      {/* File name overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-lg">
                        <p className="text-white text-xs truncate">
                          {image.filename}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    onClick={processReceivedImages}
                    disabled={isProcessing || !webhookUrl.trim()}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Analyze All
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onClearReceivedImages}
                    className="bg-black/60 border-white/10 text-white hover:bg-white/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 bg-purple-600/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-purple-400/50" />
                </div>
                <p className="text-gray-400 font-medium mb-2">
                  No gallery images
                </p>
                <p className="text-gray-500 text-sm">
                  Select images in the gallery and send them here for analysis
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl overflow-hidden">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600/20 rounded">
                <Upload className="text-blue-400" size={20} />
              </div>
              <div>
                <CardTitle className="text-white">Upload Images</CardTitle>
                <CardDescription className="text-gray-400">
                  Upload local images for analysis
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Upload Area */}
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="group block w-full p-8 border-2 border-dashed border-white/20 rounded-lg text-center cursor-pointer hover:border-blue-400/50 hover:bg-blue-600/5 transition-all duration-200"
                >
                  <div className="p-3 bg-blue-600/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                    <Plus className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-gray-300 font-medium mb-1">
                    Click to upload images
                  </p>
                  <p className="text-gray-500 text-sm">
                    Supports JPG, PNG, WebP formats
                  </p>
                </label>
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-300 font-medium">
                      Selected files ({selectedFiles.length})
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFiles([])}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  <div className="max-h-32 overflow-y-auto space-y-2 bg-black/20 rounded-lg p-3">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/10"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-1 bg-blue-600/20 rounded">
                            <ImageIcon size={14} className="text-blue-400" />
                          </div>
                          <span className="text-gray-300 text-sm truncate">
                            {file.name}
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-400 hover:text-red-300 p-1 hover:bg-red-900/20 rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={processUploadedFiles}
                    disabled={isProcessing || !webhookUrl.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analyze {selectedFiles.length} Images
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-md border-purple-500/30 rounded-xl">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <span className="text-white font-medium">
                    Submitting Images for Analysis...
                  </span>
                </div>
                <span className="bg-purple-600/30 text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                  {Math.round(processingProgress)}%
                </span>
              </div>

              <div className="w-full bg-black/60 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>

              {currentProcessingImage && (
                <p className="text-gray-400 text-sm">
                  Currently processing:{" "}
                  <span className="text-purple-300">
                    {currentProcessingImage}
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Messages */}
      {error && (
        <Alert className="bg-red-900/20 border-red-500/30 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-900/20 border-green-500/30 text-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Results Section */}
      <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-600/20 rounded">
                <Target className="text-green-400" size={20} />
              </div>
              <div>
                <CardTitle className="text-white">Analysis Results</CardTitle>
                <CardDescription className="text-gray-400">
                  AI-generated prompts and insights from your images
                </CardDescription>
              </div>
            </div>

            {results.length > 0 && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportResults}
                  className="bg-black/60 border-white/10 text-white hover:bg-white/10"
                >
                  <FileDown size={16} className="mr-1" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllResults}
                  className="bg-red-900/30 border-red-500/30 text-red-300 hover:bg-red-900/50"
                >
                  <Trash2 size={16} className="mr-1" />
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {results.length > 0 ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-gradient-to-r from-black/40 to-black/60 rounded-lg p-6 border border-white/10 hover:border-purple-400/30 transition-colors"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-600/20 rounded">
                        <Sparkles className="text-purple-400" size={16} />
                      </div>
                      <div>
                        <p className="text-gray-300 text-sm">
                          {result.timestamp.toLocaleString()}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="bg-purple-600/30 text-purple-300 px-2 py-1 rounded text-xs font-medium">
                            {result.confidence}% confidence
                          </span>
                          <span className="bg-blue-600/30 text-blue-300 px-2 py-1 rounded text-xs font-medium">
                            {result.style}
                          </span>
                          <span className="bg-green-600/30 text-green-300 px-2 py-1 rounded text-xs font-medium">
                            {result.mood}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Original Prompt */}
                  {result.originalPrompt && (
                    <div className="mb-4">
                      <Label className="text-gray-400 text-xs uppercase tracking-wide">
                        Original Prompt
                      </Label>
                      <div className="bg-black/60 border border-white/10 rounded-lg p-3 mt-2">
                        <p className="text-gray-300 text-sm">
                          {result.originalPrompt}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Generated Prompt */}
                  <div className="mb-4">
                    <Label className="text-gray-400 text-xs uppercase tracking-wide">
                      AI Generated Prompt
                    </Label>
                    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4 mt-2">
                      <p className="text-white whitespace-pre-wrap leading-relaxed">
                        {result.generatedPrompt}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  {result.tags.length > 0 && (
                    <div className="mb-4">
                      <Label className="text-gray-400 text-xs uppercase tracking-wide">
                        Detected Tags
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {result.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full text-xs border border-white/10"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end">
                    <Button
                      onClick={() => copyToClipboard(result.generatedPrompt)}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                      size="sm"
                    >
                      <Copy size={14} className="mr-2" />
                      Copy Prompt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 bg-green-600/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Target className="w-10 h-10 text-green-400/50" />
              </div>
              <p className="text-gray-400 font-medium mb-2">
                No analysis results yet
              </p>
              <p className="text-gray-500 text-sm">
                Upload images or send them from the gallery to start generating
                prompts
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptGeneratorTab;
