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
      {/* Configuration Section */}
      <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Zap className="mr-2" size={20} />
            N8N Workflow Configuration
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure your n8n webhook endpoint for image analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="webhook-url" className="text-gray-300 mb-2 block">
              Webhook URL
            </Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://n8n.tastycreative.xyz/webhook/80fb6fdb-95b6-400d-b3a6-ea6d87a30a5e"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="bg-black/60 border-white/10 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Your n8n webhook endpoint that will receive the image data
            </p>
          </div>

          {/* Connection Test */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-black/60 border-white/10 text-white hover:bg-white/10"
              onClick={async () => {
                if (!webhookUrl.trim()) {
                  setError("Please enter a webhook URL first");
                  return;
                }

                try {
                  const response = await fetch(webhookUrl, {
                    method: "HEAD",
                  });

                  if (response.ok) {
                    setSuccess("Webhook endpoint is reachable!");
                    setTimeout(() => setSuccess(""), 3000);
                  } else {
                    setError("Webhook endpoint returned an error");
                  }
                } catch (error) {
                  setError("Cannot reach webhook endpoint");
                }
              }}
              disabled={!webhookUrl.trim()}
            >
              <RefreshCw size={16} className="mr-1" />
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests Status */}
      {pendingRequests.length > 0 && (
        <Card className="bg-yellow-900/20 backdrop-blur-md border-yellow-500/30 rounded-xl">
          <CardHeader>
            <CardTitle className="text-yellow-300 flex items-center">
              <Clock className="mr-2" size={20} />
              Pending Requests ({pendingRequests.length})
            </CardTitle>
            <CardDescription className="text-yellow-200/70">
              Waiting for analysis results...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {pendingRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="flex items-center justify-between bg-black/40 p-2 rounded"
                >
                  <span className="text-yellow-200 text-sm">
                    {req.filename}
                  </span>
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-yellow-300" />
                    <span className="text-yellow-300 text-xs">
                      {Math.round(
                        (Date.now() - req.startTime.getTime()) / 1000
                      )}
                      s
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePendingRequest(req.requestId)}
                      className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                    >
                      <X size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={stopAllChecking}
                className="bg-red-900/30 border-red-500/30 text-red-300 hover:bg-red-900/40"
              >
                <X size={16} className="mr-1" />
                Cancel All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Received Images from Gallery */}
        <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center">
                <ImageIcon className="mr-2" size={20} />
                Images from Gallery
              </div>
              {receivedImages.length > 0 && (
                <span className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full text-sm">
                  {receivedImages.length}
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-gray-400">
              Images sent from the gallery for prompt analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {receivedImages.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {receivedImages.map((image, index) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.blobUrl || image.imageUrl}
                        alt={image.filename}
                        className="w-full h-20 object-cover rounded-lg border border-white/10"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Eye size={16} className="text-white" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={processReceivedImages}
                    disabled={isProcessing || !webhookUrl.trim()}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Analyze Images
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onClearReceivedImages}
                    className="bg-black/60 border-white/10 text-white hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-500 opacity-50" />
                <p className="text-gray-400">No images from gallery</p>
                <p className="text-gray-500 text-sm">
                  Select images in the gallery and send them here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Upload className="mr-2" size={20} />
              Upload Images
            </CardTitle>
            <CardDescription className="text-gray-400">
              Upload images directly for prompt analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                  className="block w-full p-4 border-2 border-dashed border-white/20 rounded-lg text-center cursor-pointer hover:border-white/40 transition-colors"
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-300">Click to upload images</p>
                  <p className="text-gray-500 text-sm">
                    Support for JPG, PNG, WebP formats
                  </p>
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-gray-300 text-sm">
                    Selected files ({selectedFiles.length}):
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/10"
                      >
                        <span className="text-gray-300 text-sm truncate">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={processUploadedFiles}
                    disabled={isProcessing || !webhookUrl.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Analyze Uploaded Images
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
        <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white">Submitting Images...</span>
                <span className="text-purple-300">
                  {Math.round(processingProgress)}%
                </span>
              </div>

              <div className="w-full bg-black/60 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>

              {currentProcessingImage && (
                <p className="text-gray-400 text-sm">
                  Currently submitting: {currentProcessingImage}
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
            <div>
              <CardTitle className="text-white flex items-center">
                <FileText className="mr-2" size={20} />
                Analysis Results
              </CardTitle>
              <CardDescription className="text-gray-400">
                Generated prompts and analysis from your images
              </CardDescription>
            </div>

            {results.length > 0 && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportResults}
                  className="bg-black/60 border-white/10 text-white hover:bg-white/10"
                >
                  <Download size={16} className="mr-1" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllResults}
                  className="bg-red-900/30 border-red-500/30 text-red-300 hover:bg-red-900/40"
                >
                  <X size={16} className="mr-1" />
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {results.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-black/40 rounded-lg p-4 border border-white/10"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-gray-300 text-sm">
                          {result.timestamp.toLocaleString()}
                        </span>
                        <span className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded text-xs">
                          {result.confidence}% confidence
                        </span>
                        <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded text-xs">
                          {result.style}
                        </span>
                        {result.requestId && (
                          <span className="bg-gray-600/20 text-gray-300 px-2 py-1 rounded text-xs font-mono">
                            {result.requestId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {result.originalPrompt && (
                    <div className="mb-3">
                      <Label className="text-gray-400 text-xs">
                        Original Prompt:
                      </Label>
                      <p className="text-gray-300 text-sm bg-black/60 p-2 rounded mt-1">
                        {result.originalPrompt}
                      </p>
                    </div>
                  )}

                  <div className="mb-3">
                    <Label className="text-gray-400 text-xs">
                      Generated Prompt:
                    </Label>
                    <div className="bg-black/60 p-3 rounded mt-1 border border-white/10">
                      <p className="text-white text-sm whitespace-pre-wrap">
                        {result.generatedPrompt}
                      </p>
                    </div>
                  </div>

                  {result.tags.length > 0 && (
                    <div className="mb-3">
                      <Label className="text-gray-400 text-xs">Tags:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(result.generatedPrompt)}
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <Copy size={14} className="mr-1" />
                      Copy Prompt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-500 opacity-50" />
              <p className="text-gray-400">No analysis results yet</p>
              <p className="text-gray-500 text-sm">
                Upload images or send them from the gallery to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptGeneratorTab;
