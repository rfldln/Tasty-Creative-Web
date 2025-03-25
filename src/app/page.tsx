"use client";

import React, { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Calendar,
  Star,
  Image,
  Mic,
  Settings,
  Play,
  Download,
  Save,
  X,
  Volume2,
  Check,
  Clock,
  RefreshCw,
  Loader2,
  LogOut,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  generateVoice,
  downloadAudio,
  API_KEY_PROFILES,
  checkApiKeyBalance,
  getVoicesForProfile,
  ELEVEN_LABS_MODELS,
  fetchHistoryFromElevenLabs,
  getHistoryAudio,
  forceRefreshHistory,
  // New imports for parameter tracking
  storeVoiceParameters,
  getVoiceParameters,
  initVoiceParametersCache,
} from "./services/elevenlabs-implementation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Import ComfyUI services
import {
  checkComfyUIConnection,
  getAvailableModels,
  generateImage,
  closeWebSocketConnection,
  COMFY_UI_CONFIG,
} from "./services/comfyui-implementation";
import LiveFlyer from "@/components/LiveFlyer";

// Define TypeScript interfaces for our data structures
interface ApiKeyBalance {
  character?: {
    limit: number;
    remaining: number;
    used: number;
  };
  status?: string;
}

interface Voice {
  name: string;
  voiceId: string;
  category?: string;
}

interface HistoryItem {
  history_item_id: string;
  text: string;
  date_unix: number;
  voice_id: string;
  voice_name?: string;
}

interface HistoryAudio {
  audioUrl: string;
  audioBlob: Blob;
}

interface GeneratedAudio {
  audioUrl: string;
  audioBlob: Blob;
  profile?: string;
  voiceName?: string;
}

interface GeneratedImage {
  imageUrl: string;
  filename?: string;
}

interface VoiceSettings {
  stability: number;
  clarity: number;
  speed: number;
  styleExaggeration: number;
  speakerBoost: boolean;
}

interface GenerationProgress {
  value?: number;
  max?: number;
}

const TastyCreative = () => {
  // Get authentication context
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("live"); // Set voice as default tab
  const [isPaid, setIsPaid] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [promptText, setPromptText] = useState("");
  const [generationStatus, setGenerationStatus] = useState("");
  const [outputFormat, setOutputFormat] = useState("png");
  const [comfyModel, setComfyModel] = useState("realistic");

  // Voice tab states
  const [voiceText, setVoiceText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(
    "eleven_multilingual_v2"
  );
  const [stability, setStability] = useState(0.5);
  const [clarity, setClarity] = useState(0.75);
  const [speed, setSpeed] = useState(1.0);
  const [styleExaggeration, setStyleExaggeration] = useState(0.3);
  const [speakerBoost, setSpeakerBoost] = useState(true);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<GeneratedAudio | null>(
    null
  );
  const [voiceError, setVoiceError] = useState("");

  // History states
  const [historyEntries, setHistoryEntries] = useState<HistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<HistoryItem | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingHistoryAudio, setIsLoadingHistoryAudio] = useState(false);
  const [historyAudio, setHistoryAudio] = useState<HistoryAudio | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [showHistory, setShowHistory] = useState(false); // Toggle state for history

  // API Key Profile state
  const [selectedApiKeyProfile, setSelectedApiKeyProfile] =
    useState("account_1");
  const [apiKeyBalance, setApiKeyBalance] = useState<ApiKeyBalance | null>(
    null
  );
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);

  // ComfyUI-related states
  const [comfyUIStatus, setComfyUIStatus] = useState("disconnected");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableSamplers, setAvailableSamplers] = useState<string[]>([]);
  const [selectedSampler, setSelectedSampler] = useState("euler_ancestral");
  const [imageWidth, setImageWidth] = useState(512);
  const [imageHeight, setImageHeight] = useState(512);
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7.5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(
    null
  );
  const [generationProgress, setGenerationProgress] = useState(0);
  const [imageError, setImageError] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyAudioRef = useRef<HTMLAudioElement | null>(null);
  const characterLimit = 1000;

  // Initialize the voice parameters cache
  useEffect(() => {
    initVoiceParametersCache();
  }, []);

  // Initialize ComfyUI connection on mount or when activeTab changes to 'image'
  useEffect(() => {
    if (activeTab === "image") {
      const initComfyUI = async () => {
        try {
          // Check connection
          const connectionStatus = await checkComfyUIConnection();
          setComfyUIStatus(connectionStatus.status);

          if (connectionStatus.status === "connected") {
            // Get available models
            const models = await getAvailableModels();
            setAvailableModels(models.checkpoints || []);
            setAvailableSamplers(models.samplers || []);

            // Set default model if available
            if (models.checkpoints && models.checkpoints.length > 0) {
              setSelectedModel(models.checkpoints[0]);
            }
          }
        } catch (error) {
          console.error("Error initializing ComfyUI:", error);
          setImageError(
            "Failed to connect to ComfyUI. Please check your RunPod instance."
          );
          setComfyUIStatus("error");
        }
      };

      initComfyUI();
    }

    // Clean up WebSocket connection when unmounting or changing tabs
    return () => {
      if (activeTab !== "image") {
        closeWebSocketConnection();
      }
    };
  }, [activeTab]);

  // Load all history without pagination
  const loadHistory = async (forceRefresh = false) => {
    if (!selectedVoice || !selectedApiKeyProfile) return;

    try {
      setIsLoadingHistory(true);
      setHistoryError("");

      // Fetch history from ElevenLabs API without pagination (large page size)
      const result = await fetchHistoryFromElevenLabs(
        selectedApiKeyProfile,
        selectedVoice,
        100, // Get all history items at once (or the maximum allowed)
        1,
        forceRefresh
      );

      setHistoryEntries(result.items || []);
    } catch (error: any) {
      console.error("Error loading history:", error);
      setHistoryError("Failed to load history from ElevenLabs");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Effect to load history when voice changes or when show history is toggled on
  useEffect(() => {
    if (selectedVoice && showHistory) {
      loadHistory(); // Load history when voice changes or when history is shown
    }
  }, [selectedVoice, selectedApiKeyProfile, showHistory]);

  // Update available voices when API key profile changes
  useEffect(() => {
    const fetchApiData = async () => {
      if (!selectedApiKeyProfile) return;

      setIsCheckingBalance(true);
      setVoiceError("");

      try {
        // Fetch balance
        const balance = await checkApiKeyBalance(selectedApiKeyProfile);
        setApiKeyBalance(balance);

        // Get voices for the selected profile
        const profileVoices = getVoicesForProfile(selectedApiKeyProfile);
        setAvailableVoices(profileVoices);

        // Reset selected voice when changing profiles
        setSelectedVoice(profileVoices[0]?.voiceId || "");
      } catch (error: any) {
        console.error("Error fetching API data:", error);
        setApiKeyBalance({
          character: {
            limit: 0,
            remaining: 0,
            used: 0,
          },
          status: "error",
        });
        setVoiceError("There was an issue connecting to the API.");
      } finally {
        setIsCheckingBalance(false);
      }
    };

    fetchApiData();
  }, [selectedApiKeyProfile]);

  // Function to reload history with delay to allow API to update
  const reloadHistoryWithDelay = async () => {
    // Wait for 1 second to give the ElevenLabs API time to update
    setTimeout(() => {
      loadHistory(true); // Force refresh from API
    }, 1000);
  };

  // Updated handleGenerate function for voice generation with API key profiles
  const handleGenerateVoice = async () => {
    if (!selectedApiKeyProfile) {
      setVoiceError("API key profile must be selected");
      return;
    }

    if (!selectedVoice) {
      setVoiceError("Please select a voice");
      return;
    }

    if (!voiceText.trim()) {
      setVoiceError("Please enter some text");
      return;
    }

    setVoiceError("");
    setIsGeneratingVoice(true);
    setGenerationStatus("Generating voice with ElevenLabs...");

    try {
      // Get the selected voice
      const selectedVoiceDetails = availableVoices.find(
        (voice) => voice.voiceId === selectedVoice
      );

      if (!selectedVoiceDetails) {
        throw new Error("Voice not found");
      }

      const result = await generateVoice(
        selectedApiKeyProfile,
        selectedVoice,
        voiceText,
        selectedModelId,
        {
          stability,
          clarity,
          speed,
          styleExaggeration,
          speakerBoost,
        }
      );

      setGeneratedAudio({
        ...result,
        voiceName: selectedVoiceDetails.name,
      });
      setGenerationStatus("Voice generated successfully!");

      // Refresh balance after generation
      const balance = await checkApiKeyBalance(selectedApiKeyProfile);
      setApiKeyBalance(balance);

      // Refresh history
      reloadHistoryWithDelay();
    } catch (error: any) {
      console.error("Voice generation error:", error);
      setVoiceError(error.message || "Failed to generate voice");
      setGenerationStatus("");
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  // Handle image generation with ComfyUI
  const handleGenerateImage = async () => {
    if (!promptText.trim()) {
      setImageError("Please enter a prompt");
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationProgress(0);
      setImageError("");

      const imageResult = await generateImage({
        prompt: promptText,
        negativePrompt: negativePrompt,
        model: selectedModel,
        sampler: selectedSampler,
        steps: steps,
        cfgScale: cfgScale,
        width: imageWidth,
        height: imageHeight,
        onProgress: (progress: GenerationProgress) => {
          // Update progress based on step count
          if (progress.value && progress.max) {
            setGenerationProgress(
              Math.floor((progress.value / progress.max) * 100)
            );
          }
        },
      });

      setGeneratedImage(imageResult);
    } catch (error: any) {
      console.error("Image generation error:", error);
      setImageError(error.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle image download
  const handleDownloadImage = () => {
    if (generatedImage?.imageUrl) {
      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = generatedImage.imageUrl;
      link.download = generatedImage.filename || "generated-image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePlayHistoryAudio = async (historyItem: HistoryItem) => {
    try {
      setIsLoadingHistoryAudio(true);
      setSelectedHistoryItem(historyItem);
      setHistoryError("");

      // Get audio for this history item
      const audio = await getHistoryAudio(
        selectedApiKeyProfile,
        historyItem.history_item_id
      );
      setHistoryAudio(audio);

      // Play it
      setTimeout(() => {
        if (historyAudioRef.current) {
          historyAudioRef.current.play();
        }
      }, 100);
    } catch (error: any) {
      console.error("Error playing history audio:", error);
      setHistoryError("Failed to load audio from history");
    } finally {
      setIsLoadingHistoryAudio(false);
    }
  };

  const handleStopHistoryAudio = () => {
    if (historyAudioRef.current) {
      historyAudioRef.current.pause();
      historyAudioRef.current.currentTime = 0;
    }
  };

  const handleDownloadHistoryAudio = (historyItem: HistoryItem) => {
    if (historyAudio?.audioBlob) {
      downloadAudio(
        historyAudio.audioBlob,
        `${historyItem.voice_name || "voice"}-${
          historyItem.history_item_id
        }.mp3`
      );
    }
  };

  const handleDownloadAudio = () => {
    if (generatedAudio?.audioBlob) {
      downloadAudio(
        generatedAudio.audioBlob,
        `${generatedAudio.voiceName}-voice.mp3`
      );
    }
  };

  const handlePlayAudio = () => {
    if (audioRef.current && generatedAudio?.audioUrl) {
      audioRef.current.play();
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Updated to use history item instead of just text
  const handleUseHistoryText = (historyItem: HistoryItem) => {
    // Still set the text
    setVoiceText(historyItem.text);

    // Try to get stored parameters for this history item
    const storedParams = getVoiceParameters(historyItem.history_item_id);

    if (storedParams) {
      // Apply the stored parameters
      if (storedParams.stability !== undefined)
        setStability(storedParams.stability);
      if (storedParams.clarity !== undefined) setClarity(storedParams.clarity);
      if (storedParams.speed !== undefined) setSpeed(storedParams.speed);
      if (storedParams.styleExaggeration !== undefined)
        setStyleExaggeration(storedParams.styleExaggeration);
      if (storedParams.speakerBoost !== undefined)
        setSpeakerBoost(storedParams.speakerBoost);
      if (storedParams.modelId !== undefined)
        setSelectedModelId(storedParams.modelId);

      // Show a success notification
      setGenerationStatus(`Voice parameters restored from history`);
      setTimeout(() => setGenerationStatus(""), 3000);
    } else {
      // If no parameters found, let the user know
      setGenerationStatus(`No saved parameters found for this history item`);
      setTimeout(() => setGenerationStatus(""), 3000);
    }
  };

  // Function to manually refresh history
  const handleRefreshHistory = () => {
    loadHistory(true); // Force refresh of history
  };

  // Format date for display
  const formatDate = (dateString: number) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString.toString();
    }
  };

  const truncateText = (text: string | undefined, maxLength = 30) => {
    return text && text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text || "";
  };

  return (
    <div className="relative flex flex-col w-full min-h-screen text-white">
      {/* Space background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-purple-950/60 to-blue-950/90"></div>

      {/* Audio elements for playback */}
      {generatedAudio?.audioUrl ? (
        <audio ref={audioRef} src={generatedAudio.audioUrl} />
      ) : (
        <audio ref={audioRef} />
      )}

      {historyAudio?.audioUrl ? (
        <audio ref={historyAudioRef} src={historyAudio.audioUrl} />
      ) : (
        <audio ref={historyAudioRef} />
      )}

      {/* Header - Updated with logout button and user from auth context */}
      <div className="relative z-10 backdrop-blur-xl bg-black/40 border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
            <Star size={16} className="text-white" />
          </div>
          <h1 className="text-xl font-bold">Tasty Creative</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-300 text-sm">
            Welcome, {user || "Admin"}
          </span>
          <Button
            variant="outline"
            className="text-white border-white/20 bg-white/5 hover:bg-white/10 rounded-full"
          >
            <Settings size={14} />
          </Button>
          <Button
            variant="outline"
            className="text-white border-white/20 bg-white/5 hover:bg-white/10 rounded-full"
            onClick={logout}
            title="Logout"
          >
            <LogOut size={14} />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto p-4">
        <Tabs
          defaultValue={activeTab}
          className="w-full"
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-5 mb-6 bg-black/30 backdrop-blur-lg rounded-full p-1 border border-white/10">
            <TabsTrigger
              value="live"
              className="text-sm rounded-full text-white data-[state=active]:text-black"
            >
              <Calendar size={16} className="mr-1" />
              Live
            </TabsTrigger>
            <TabsTrigger
              value="vip"
              className="text-sm rounded-full text-white data-[state=active]:text-black"
            >
              <Star size={16} className="mr-1" />
              VIP
            </TabsTrigger>
            <TabsTrigger
              value="game"
              className="text-sm rounded-full text-white data-[state=active]:text-black"
            >
              <div className="mr-1">🎮</div>
              Game
            </TabsTrigger>
            <TabsTrigger
              value="image"
              className="text-sm rounded-full text-white data-[state=active]:text-black"
            >
              <Image size={16} className="mr-1" />
              AI Image
            </TabsTrigger>
            <TabsTrigger
              value="voice"
              className="text-sm rounded-full text-white data-[state=active]:text-black"
            >
              <Mic size={16} className="mr-1" />
              AI Voice
            </TabsTrigger>
          </TabsList>

          {/* Other tabs content remains the same */}
          <TabsContent value="live">
            <LiveFlyer />
          </TabsContent>

          {/* New AI Image Tab with ComfyUI */}
          <TabsContent value="image">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel - Image Generation Controls */}
              <Card className="lg:col-span-2 bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-white">
                      AI Image Generation
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Generate custom images using your RunPod ComfyUI
                    </CardDescription>
                  </div>

                  {/* Status indicator */}
                  <div className="min-w-48">
                    <div className="flex items-center">
                      <div
                        className={`rounded-full w-3 h-3 ${
                          comfyUIStatus === "connected"
                            ? "bg-green-500"
                            : comfyUIStatus === "connecting"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        } mr-2`}
                      ></div>
                      <span className="text-sm">
                        {comfyUIStatus === "connected"
                          ? "Connected to RunPod"
                          : comfyUIStatus === "connecting"
                          ? "Connecting..."
                          : "Disconnected"}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Prompt input */}
                  <div>
                    <Label
                      htmlFor="prompt"
                      className="text-gray-300 mb-1 block"
                    >
                      Prompt
                    </Label>
                    <Textarea
                      id="prompt"
                      placeholder="A detailed description of the image you want to generate"
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      className="bg-black/60 border-white/10 text-white rounded-lg min-h-24"
                    />
                  </div>

                  {/* Negative prompt */}
                  <div>
                    <Label
                      htmlFor="negative-prompt"
                      className="text-gray-300 mb-1 block"
                    >
                      Negative Prompt
                    </Label>
                    <Textarea
                      id="negative-prompt"
                      placeholder="Elements you want to exclude from the image"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      className="bg-black/60 border-white/10 text-white rounded-lg min-h-20"
                    />
                  </div>

                  {/* Model selection */}
                  <div>
                    <Label
                      htmlFor="model-selection"
                      className="text-gray-300 mb-1 block"
                    >
                      Select Model ({availableModels.length} available)
                    </Label>
                    <Select
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                      disabled={availableModels.length === 0}
                    >
                      <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-lg">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/10 text-white max-h-72">
                        {availableModels.map((model) => (
                          <SelectItem
                            key={model}
                            value={model}
                            className="flex items-center justify-between py-2"
                          >
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sampler selection */}
                  <div>
                    <Label
                      htmlFor="sampler-selection"
                      className="text-gray-300 mb-1 block"
                    >
                      Sampler
                    </Label>
                    <Select
                      value={selectedSampler}
                      onValueChange={setSelectedSampler}
                      disabled={availableSamplers.length === 0}
                    >
                      <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-lg">
                        <SelectValue placeholder="Select a sampler" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/10 text-white">
                        {availableSamplers.map((sampler) => (
                          <SelectItem key={sampler} value={sampler}>
                            {sampler}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Image dimensions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="width"
                        className="text-gray-300 mb-1 block"
                      >
                        Width: {imageWidth}px
                      </Label>
                      <Slider
                        id="width"
                        value={[imageWidth]}
                        min={256}
                        max={1024}
                        step={64}
                        onValueChange={(value) => setImageWidth(value[0])}
                        className="py-2"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="height"
                        className="text-gray-300 mb-1 block"
                      >
                        Height: {imageHeight}px
                      </Label>
                      <Slider
                        id="height"
                        value={[imageHeight]}
                        min={256}
                        max={1024}
                        step={64}
                        onValueChange={(value) => setImageHeight(value[0])}
                        className="py-2"
                      />
                    </div>
                  </div>

                  {/* Generation parameters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="steps"
                        className="text-gray-300 mb-1 block"
                      >
                        Steps: {steps}
                      </Label>
                      <Slider
                        id="steps"
                        value={[steps]}
                        min={10}
                        max={50}
                        step={1}
                        onValueChange={(value) => setSteps(value[0])}
                        className="py-2"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        More steps = more detail but slower generation
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="cfg" className="text-gray-300 mb-1 block">
                        CFG Scale: {cfgScale}
                      </Label>
                      <Slider
                        id="cfg"
                        value={[cfgScale]}
                        min={1}
                        max={15}
                        step={0.1}
                        onValueChange={(value) => setCfgScale(value[0])}
                        className="py-2"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        How closely to follow the prompt
                      </p>
                    </div>
                  </div>

                  {/* Error display */}
                  {imageError && (
                    <Alert
                      variant="destructive"
                      className="bg-red-900/20 border-red-500/30 text-red-200"
                    >
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{imageError}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg"
                    onClick={handleGenerateImage}
                    disabled={
                      isGenerating ||
                      comfyUIStatus !== "connected" ||
                      !selectedModel
                    }
                  >
                    {isGenerating
                      ? `Generating... ${generationProgress}%`
                      : "Generate Image"}
                  </Button>
                </CardFooter>
              </Card>

              {/* Right Panel - Image Preview */}
              <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white">Image Preview</CardTitle>
                  <CardDescription className="text-gray-400">
                    View and download generated images
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col items-center justify-center">
                  {/* Image display area */}
                  <div className="w-full aspect-square bg-black/50 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                    {isGenerating ? (
                      <div className="text-center p-4">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-400" />
                        <p className="text-gray-300">
                          Generating image... {generationProgress}%
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          This may take a minute or two
                        </p>
                      </div>
                    ) : generatedImage ? (
                      <img
                        src={generatedImage.imageUrl}
                        alt="Generated"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Image className="w-12 h-12 mx-auto mb-4 text-gray-500 opacity-50" />
                        <p className="text-gray-300">
                          Generated image will appear here
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Download button */}
                  {generatedImage && (
                    <Button
                      variant="outline"
                      className="mt-4 bg-white/5 border-white/10 hover:bg-white/10"
                      onClick={handleDownloadImage}
                    >
                      <Download size={16} className="mr-2" /> Download Image
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhanced Voice Tab with ElevenLabs API history */}
          <TabsContent value="voice">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-white">
                      Professional AI Voice Generation
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Convert text to high-quality professional voices using
                      ElevenLabs
                    </CardDescription>
                  </div>

                  {/* API Profile Selection with status indicator */}
                  <div className="min-w-48">
                    <Select
                      value={selectedApiKeyProfile}
                      onValueChange={setSelectedApiKeyProfile}
                    >
                      <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-lg w-full">
                        <SelectValue placeholder="Select API profile" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/10 text-white">
                        {Object.entries(API_KEY_PROFILES).map(
                          ([key, profile]) => (
                            <SelectItem
                              key={key}
                              value={key}
                              className="flex items-center"
                            >
                              {profile.name}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>

                    {apiKeyBalance && (
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-900/30 text-green-300 border border-green-500/30">
                          <Check size={10} className="mr-1" />
                          Active
                        </div>
                        <span className="text-gray-300">
                          {apiKeyBalance?.character?.remaining !== undefined
                            ? apiKeyBalance.character.remaining.toLocaleString()
                            : "N/A"}{" "}
                          characters left
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Voice selection with available voices from the current profile */}
                  <div>
                    <Label
                      htmlFor="voice-selection"
                      className="text-gray-300 mb-1 block"
                    >
                      Select Voice ({availableVoices.length} available)
                    </Label>
                    <Select
                      value={selectedVoice}
                      onValueChange={setSelectedVoice}
                      disabled={availableVoices.length === 0}
                    >
                      <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-lg">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/10 text-white max-h-72">
                        {availableVoices.map((voice) => (
                          <SelectItem
                            key={voice.voiceId}
                            value={voice.voiceId}
                            className="flex items-center justify-between py-2"
                          >
                            {voice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Model selection */}
                  <div>
                    <Label
                      htmlFor="model-selection"
                      className="text-gray-300 mb-1 block"
                    >
                      Select AI Model
                    </Label>
                    <Select
                      value={selectedModelId}
                      onValueChange={setSelectedModelId}
                    >
                      <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/10 text-white">
                        {ELEVEN_LABS_MODELS.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-1">
                      {ELEVEN_LABS_MODELS.find((m) => m.id === selectedModelId)
                        ?.description || ""}
                    </p>
                  </div>

                  {/* Text input */}
                  <div>
                    <Label
                      htmlFor="voice-text"
                      className="text-gray-300 mb-1 block"
                    >
                      Voice Text
                    </Label>
                    <Textarea
                      id="voice-text"
                      placeholder="Enter text to convert to speech"
                      value={voiceText}
                      onChange={(e) => setVoiceText(e.target.value)}
                      maxLength={characterLimit}
                      className="bg-black/60 border-white/10 text-white rounded-lg min-h-24"
                    />
                    <div className="text-right text-xs text-gray-400 mt-1">
                      {voiceText.length}/{characterLimit} characters
                    </div>
                  </div>

                  {/* Voice parameters */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-gray-300">
                          Stability: {stability.toFixed(2)}
                        </Label>
                      </div>
                      <Slider
                        value={[stability]}
                        min={0}
                        max={1}
                        step={0.01}
                        onValueChange={(value) => setStability(value[0])}
                        className="py-2"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Higher values make the voice more consistent between
                        generations
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-gray-300">
                          Similarity: {clarity.toFixed(2)}
                        </Label>
                      </div>
                      <Slider
                        value={[clarity]}
                        min={0}
                        max={1}
                        step={0.01}
                        onValueChange={(value) => setClarity(value[0])}
                        className="py-2"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Higher values make the voice more similar to the
                        original voice
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-gray-300">
                          Speed: {speed.toFixed(2)}x
                        </Label>
                      </div>
                      <Slider
                        value={[speed]}
                        min={0.7}
                        max={1.2}
                        step={0.01}
                        onValueChange={(value) => setSpeed(value[0])}
                        className="py-2"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Adjust speaking speed (0.7x slower to 1.2x faster)
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-gray-300">
                          Style Exaggeration: {styleExaggeration.toFixed(2)}
                        </Label>
                      </div>
                      <Slider
                        value={[styleExaggeration]}
                        min={0}
                        max={1}
                        step={0.01}
                        onValueChange={(value) =>
                          setStyleExaggeration(value[0])
                        }
                        className="py-2"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Higher values emphasize the voice style more strongly
                      </p>
                    </div>
                  </div>

                  {voiceError && (
                    <Alert
                      variant="destructive"
                      className="bg-red-900/20 border-red-500/30 text-red-200"
                    >
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{voiceError}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg"
                    onClick={handleGenerateVoice}
                    disabled={
                      isGeneratingVoice ||
                      !selectedApiKeyProfile ||
                      !selectedVoice ||
                      !voiceText.trim()
                    }
                  >
                    {isGeneratingVoice
                      ? "Generating..."
                      : "Generate Professional Voice"}
                  </Button>
                </CardFooter>
              </Card>

              {/* Preview card with history moved here */}
              <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white flex justify-between items-center">
                    <span>Voice Preview</span>
                    <div className="flex space-x-2">
                      {selectedVoice && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-black/60 border-white/10 text-white hover:bg-black/80 flex items-center h-7 px-2"
                            onClick={() => setShowHistory(!showHistory)}
                          >
                            <Clock size={12} className="mr-1" />
                            {showHistory ? "Hide History" : "Show History"}
                          </Button>

                          {showHistory && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-black/60 border-white/10 text-white hover:bg-black/80 flex items-center h-7 px-2"
                              onClick={handleRefreshHistory}
                              disabled={isLoadingHistory}
                            >
                              {isLoadingHistory ? (
                                <Loader2
                                  size={12}
                                  className="mr-1 animate-spin"
                                />
                              ) : (
                                <RefreshCw size={12} className="mr-1" />
                              )}
                              Refresh
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Listen to and download generated voice
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col h-96">
                  {" "}
                  {/* Fixed height container with room for history toggle */}
                  {/* Active preview section */}
                  {generatedAudio ? (
                    <div className="w-full text-center mb-4">
                      <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/10">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mb-3">
                          <Volume2 size={32} className="text-white" />
                        </div>
                        <p className="text-white mb-1 font-medium">
                          {generatedAudio.voiceName}
                        </p>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {voiceText.length > 60
                            ? voiceText.substring(0, 60) + "..."
                            : voiceText}
                        </p>
                        {generatedAudio.profile && (
                          <div className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-purple-800/50 border border-purple-400/30">
                            {generatedAudio.profile}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/10 hover:bg-white/10"
                          onClick={handlePlayAudio}
                        >
                          <Play size={14} className="mr-1" /> Play
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/10 hover:bg-white/10"
                          onClick={handleStopAudio}
                        >
                          <X size={14} className="mr-1" /> Stop
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/10 hover:bg-white/10"
                          onClick={handleDownloadAudio}
                        >
                          <Download size={14} className="mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                  ) : selectedHistoryItem && historyAudio ? (
                    <div className="w-full text-center mb-4">
                      <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/10">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mb-3">
                          <Volume2 size={32} className="text-white" />
                        </div>
                        <p className="text-white mb-1 font-medium">
                          {selectedHistoryItem.voice_name || "Voice"}
                        </p>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {selectedHistoryItem.text &&
                          selectedHistoryItem.text.length > 60
                            ? selectedHistoryItem.text.substring(0, 60) + "..."
                            : selectedHistoryItem.text || ""}
                        </p>
                        <div className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-purple-800/50 border border-purple-400/30">
                          History Item
                        </div>
                      </div>

                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/10 hover:bg-white/10"
                          onClick={() =>
                            historyAudioRef.current &&
                            historyAudioRef.current.play()
                          }
                        >
                          <Play size={14} className="mr-1" /> Play
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/10 hover:bg-white/10"
                          onClick={handleStopHistoryAudio}
                        >
                          <X size={14} className="mr-1" /> Stop
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/10 hover:bg-white/10"
                          onClick={() =>
                            handleDownloadHistoryAudio(selectedHistoryItem)
                          }
                        >
                          <Download size={14} className="mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                  ) : !selectedVoice ? (
                    <div className="text-center text-gray-400 p-8">
                      <Mic size={48} className="mx-auto mb-3 opacity-50" />
                      <p>Generated voice will appear here</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Select a voice first
                      </p>
                    </div>
                  ) : null}
                  {/* Voice History Section - now toggleable and scrollable */}
                  {selectedVoice && showHistory && (
                    <div className="flex-1 mt-4">
                      <div className="flex items-center mb-2">
                        <Clock size={14} className="mr-2 text-gray-400" />
                        <h3 className="text-sm font-medium text-gray-300">
                          History
                        </h3>

                        {isLoadingHistory && (
                          <div className="flex items-center text-xs text-purple-300 ml-2">
                            <Loader2 size={12} className="mr-1 animate-spin" />
                            Loading...
                          </div>
                        )}
                      </div>

                      {historyError && (
                        <Alert
                          variant="destructive"
                          className="mb-3 bg-red-900/20 border-red-500/30 text-red-200"
                        >
                          <AlertDescription>{historyError}</AlertDescription>
                        </Alert>
                      )}

                      {/* Scrollable history list */}
                      <div className="overflow-y-auto max-h-56 border border-white/10 rounded-lg bg-black/40 p-2">
                        {isLoadingHistory && historyEntries.length === 0 ? (
                          <div className="flex justify-center items-center p-8">
                            <Loader2
                              size={24}
                              className="animate-spin text-purple-400"
                            />
                          </div>
                        ) : historyEntries.length > 0 ? (
                          <Accordion
                            type="single"
                            collapsible
                            className="w-full"
                          >
                            {historyEntries.map((item, index) => (
                              <AccordionItem
                                key={item.history_item_id}
                                value={item.history_item_id}
                                className="border-white/10"
                              >
                                <AccordionTrigger className="text-sm hover:no-underline py-2">
                                  <div className="flex items-center text-left w-full">
                                    <span className="truncate max-w-[150px] text-xs text-gray-300">
                                      {truncateText(item.text)}
                                    </span>
                                    <span className="ml-auto text-xs text-gray-500">
                                      {formatDate(item.date_unix * 1000)}
                                    </span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="bg-black/20 p-2 rounded-md space-y-2 text-xs">
                                    <p className="text-gray-300">{item.text}</p>
                                    <p className="text-gray-400">
                                      Generated:{" "}
                                      {formatDate(item.date_unix * 1000)}
                                    </p>

                                    {/* Add indicator for available parameters */}
                                    {getVoiceParameters(
                                      item.history_item_id
                                    ) && (
                                      <div className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-green-800/50 border border-green-400/30">
                                        <Check size={8} className="mr-1" />{" "}
                                        Parameters Available
                                      </div>
                                    )}

                                    <div className="flex flex-wrap gap-1 mt-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-white/5 border-white/10 hover:bg-white/10 text-xs h-7 px-2"
                                        onClick={() =>
                                          handlePlayHistoryAudio(item)
                                        }
                                        disabled={
                                          isLoadingHistoryAudio &&
                                          selectedHistoryItem?.history_item_id ===
                                            item.history_item_id
                                        }
                                      >
                                        {isLoadingHistoryAudio &&
                                        selectedHistoryItem?.history_item_id ===
                                          item.history_item_id ? (
                                          <>
                                            <Loader2
                                              size={10}
                                              className="mr-1 animate-spin"
                                            />{" "}
                                            Load
                                          </>
                                        ) : (
                                          <>
                                            <Play size={10} className="mr-1" />{" "}
                                            Play
                                          </>
                                        )}
                                      </Button>
                                      {/* Pass entire item instead of just text */}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-white/5 border-white/10 hover:bg-white/10 text-xs h-7 px-2"
                                        onClick={() =>
                                          handleUseHistoryText(item)
                                        }
                                      >
                                        <RefreshCw size={10} className="mr-1" />{" "}
                                        Use
                                      </Button>
                                      {selectedHistoryItem?.history_item_id ===
                                        item.history_item_id &&
                                        historyAudio && (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="bg-white/5 border-white/10 hover:bg-white/10 text-xs h-7 px-2"
                                              onClick={handleStopHistoryAudio}
                                            >
                                              <X size={10} className="mr-1" />{" "}
                                              Stop
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="bg-white/5 border-white/10 hover:bg-white/10 text-xs h-7 px-2"
                                              onClick={() =>
                                                handleDownloadHistoryAudio(item)
                                              }
                                            >
                                              <Download
                                                size={10}
                                                className="mr-1"
                                              />{" "}
                                              DL
                                            </Button>
                                          </>
                                        )}
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        ) : (
                          <div className="text-center py-6 text-gray-400">
                            <p>No history found for this voice.</p>
                            <p className="text-xs mt-2">
                              Generate some audio to see it in your history.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {generationStatus && !voiceError && (
              <div className="mt-4 p-4 bg-black/40 backdrop-blur-md rounded-md border border-white/10">
                <h3 className="font-medium mb-2">
                  ElevenLabs Generation Status
                </h3>
                <p>{generationStatus}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="vip">
            {/* Keep existing VIP code */}
            <div className="p-4 text-center bg-black/20 rounded-lg border border-white/10">
              <h3 className="font-medium mb-2">VIP Tab Content</h3>
              <p>
                Switch to the Voice tab to access the enhanced ElevenLabs voice
                generation
              </p>
            </div>
          </TabsContent>

          <TabsContent value="game">
            {/* Keep existing Game code */}
            <div className="p-4 text-center bg-black/20 rounded-lg border border-white/10">
              <h3 className="font-medium mb-2">Game Tab Content</h3>
              <p>
                Switch to the Voice tab to access the enhanced ElevenLabs voice
                generation
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Status Bar */}
      <div className="mt-auto bg-black/20 backdrop-blur-md p-2 text-sm text-gray-400 border-t border-white/5 relative z-10">
        <div className="container mx-auto flex justify-between">
          <div>Tasty Creative v1.0</div>
          <div>
            Status:
            {activeTab === "image" && (
              <span
                className={`ml-1 ${
                  comfyUIStatus === "connected"
                    ? "text-green-400"
                    : "text-yellow-400"
                }`}
              >
                RunPod ComfyUI{" "}
                {comfyUIStatus === "connected"
                  ? "(Connected)"
                  : "(Disconnected)"}
              </span>
            )}
            {activeTab === "voice" && (
              <span className="text-green-400 ml-1">
                ElevenLabs
                {apiKeyBalance && (
                  <span className="ml-1">
                    (
                    {apiKeyBalance?.character?.remaining !== undefined
                      ? apiKeyBalance.character.remaining.toLocaleString()
                      : "N/A"}{" "}
                    chars)
                  </span>
                )}
              </span>
            )}
            {activeTab !== "image" && activeTab !== "voice" && (
              <span className="ml-1">No active API connections</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="w-full h-full">
      <TastyCreative />
    </div>
  );
}
