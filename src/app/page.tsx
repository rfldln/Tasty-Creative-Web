"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Calendar as CalendarIcon,
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash,
  MapPin,
  User,
  Users,
  Video,
  Phone,
  MoreHorizontal,
  ExternalLink,
  FileText,
  UsersRound,
  CircleDollarSign,
  Twitter,
  PencilRuler,
  Clapperboard,
  MessageSquareText
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
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

// Import dialog components for event details
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";

// Import ComfyUI services
import {
  checkComfyUIConnection,
  getAvailableModels,
  generateImage,
  closeWebSocketConnection,
  COMFY_UI_CONFIG
} from './services/comfyui-implementation';

// Import Google Calendar services
import {
  initGoogleCalendarAuth,
  getCalendarEvents,
  addCalendarEvent,
  signInWithGoogle,
  signOutFromGoogle,
  isUserSignedIn,
  getEventById,
  getPublicCalendarEvents
} from './services/google-calendar-implementation';
import LiveFlyer from '@/components/LiveFlyer';

import { useRouter, useSearchParams } from 'next/navigation';
import VIPFlyer from '@/components/VIPFlyer';
import ModelPage from './models/page';
import FTTPage from '@/components/FTTPage';
import TwitterAdsPage from '@/components/TwitterAdsPage';
import LaunchPrepDetails from '@/components/LaunchPrepDetails';
import GenerationTab from '@/components/GenerationTab';
import ChattingTab from '@/components/ChattingTab';
import OnboardingTab from '@/components/OnboardingTab';

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

interface EventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
  organizer?: boolean;
  self?: boolean;
}

interface EventConferenceData {
  conferenceId: string;
  conferenceSolution?: {
    key: {
      type: string;
    };
    name: string;
    iconUri: string;
  };
  entryPoints?: Array<{
    entryPointType: string;
    uri: string;
    label?: string;
  }>;
}

interface CalendarEvent {
  id?: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  description?: string;
  creator?: {
    email: string;
    displayName?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
  };
  attendees?: EventAttendee[];
  conferenceData?: EventConferenceData;
  status?: string;
  htmlLink?: string;
  colorId?: string;
}

const TastyCreative = () => {
  // Get authentication context
  const { user, logout } = useAuth();

  const searchParams = useSearchParams();
  const [tabValue, setTabValue] = useState<string>(searchParams?.get('tab') || 'dashboard');
  const router = useRouter();

  console.log(tabValue, 'tabValue')

  const [displayName, setDisplayName] = useState("Admin");
 const [activeTab, setActiveTab] = useState(tabValue || 'dashboard');
  const [isPaid, setIsPaid] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [promptText, setPromptText] = useState("");
  const [generationStatus, setGenerationStatus] = useState("");
  const [outputFormat, setOutputFormat] = useState("png");
  const [comfyModel, setComfyModel] = useState("realistic");

  const [notifications, setNotifications] = useState<NotificationData[]>([]);

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
  const [generatedAudio, setGeneratedAudio] = useState<GeneratedAudio | null>(null);
  const [voiceError, setVoiceError] = useState('');

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
  const [imageError, setImageError] = useState('');

  // Calendar tab states
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [isCalendarSignedIn, setIsCalendarSignedIn] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [isLoadingEventDetail, setIsLoadingEventDetail] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyAudioRef = useRef<HTMLAudioElement | null>(null);
  const characterLimit = 1000;

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    const params = new URLSearchParams(searchParams?.toString() || "");
    
    params.set('tab', value);
    
    router.replace(`?${params.toString()}`, { scroll: false });

   
  };

  const triggerTabChange = (tab: string, model: string) => {
    setTabValue(tab);
    window.history.pushState(null, '', `?tab=${tab}&model=${model}`);
    window.location.reload();
  };

  useEffect(() => {
    if (tabValue === "dashboard" || tabValue === "") {
      let intervalId: NodeJS.Timeout;

      const fetchNotifications = async () => {
        try {
          const res = await fetch("/api/notifications");
          if (res.ok) {
            const data = await res.json();
            console.log("Fetched Notifications:", data.notifications); // Log the fetched data
            setNotifications(data.notifications || []);
          }
        } catch (error) {
          console.error("Error fetching notifications:", error);
        }
      };

      // Initial fetch
      fetchNotifications();

      // Poll every 5 seconds
      intervalId = setInterval(fetchNotifications, 5000);

      // Cleanup
      return () => clearInterval(intervalId);
    }
  }, [tabValue]);

  // Initialize the voice parameters cache
  useEffect(() => {
    initVoiceParametersCache();
  }, []);

  // Update the display name when user changes
  useEffect(() => {
    if (user) {
      setDisplayName(user);
    }
  }, [user]);


  // Update the effect that initializes Google Calendar
  useEffect(() => {

   const loadCalendarEventsForMonth = async () => {
  if (activeTab === 'dashboard') {
    console.log(`Month changed to ${selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}, loading events...`);

    // Clear events first to avoid stale data being displayed
    setCalendarEvents([]);
    setIsCalendarLoading(true);
    setCalendarError('');

    const startDate = new Date(selectedDate);
    startDate.setDate(1); // First day of month
    startDate.setHours(0, 0, 0, 0); // Start of day

    const endDate = new Date(selectedDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0); // Last day of month
    endDate.setHours(23, 59, 59, 999); // End of day

    console.log(`Date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

    try {
      // Always use the public calendar API without checking authentication
      const events = await getPublicCalendarEvents(startDate, endDate);
      console.log(`Received ${events.length} events from public API`);

      // Filter out events that have "Call" in the title
      const filteredEvents = events.filter(event => 
        !event.summary?.toLowerCase().includes('call')
      );

      // Update state with filtered events
      setCalendarEvents(filteredEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      setCalendarError('Failed to load events from calendar.');
    } finally {
      setIsCalendarLoading(false);
    }
  }
};


    loadCalendarEventsForMonth();
  }, [selectedDate, activeTab]);

  useEffect(() => {
    const loadCalendarEventsForMonth = async () => {
      if (activeTab === 'calendar') {
        console.log(`Month changed to ${selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}, loading events...`);

        // Clear events first to avoid stale data being displayed
        setCalendarEvents([]);
        setIsCalendarLoading(true);
        setCalendarError('');

        const startDate = new Date(selectedDate);
        startDate.setDate(1); // First day of month
        startDate.setHours(0, 0, 0, 0); // Start of day

        const endDate = new Date(selectedDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0); // Last day of month
        endDate.setHours(23, 59, 59, 999); // End of day

        console.log(`Date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

        try {
          let events = [];

          // Check if user is signed in
          const isSignedIn = await isUserSignedIn();
          setIsCalendarSignedIn(isSignedIn);

          if (isSignedIn) {
            // If signed in, fetch events using the authenticated API
            events = await getCalendarEvents(startDate, endDate);
            console.log(`Received ${events.length} events from authenticated API`);
          } else {
            // If not signed in, use the public calendar API
            events = await getPublicCalendarEvents(startDate, endDate);
            console.log(`Received ${events.length} events from public API`);
          }

          // Update state with events
          setCalendarEvents(events);
        } catch (error) {
          console.error('Error loading calendar events:', error);
          setCalendarError('Failed to load events from calendar.');

          // If it's an authentication error, update the sign-in status
          if (error && typeof error === 'object') {
            const errorObj = error as Record<string, any>;
            if (errorObj.status === 401 || (errorObj.message && typeof errorObj.message === 'string' && errorObj.message.includes('auth'))) {
              setIsCalendarSignedIn(false);
            }
          }
        } finally {
          setIsCalendarLoading(false);
        }
      }
    };

    loadCalendarEventsForMonth();
  }, [selectedDate, activeTab]);

  // Initialize ComfyUI connection on mount or when activeTab changes to 'image'
  useEffect(() => {
    if (activeTab === "image") {
      const initComfyUI = async () => {
        try {
          // Check connection
          const connectionStatus = await checkComfyUIConnection();
          setComfyUIStatus(connectionStatus.status);

          if (connectionStatus.status === 'connected') {
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

  // Format date and time for event details
  const formatDateTime = (dateTimeStr: string | undefined, isAllDay: boolean = false) => {
    if (!dateTimeStr) return 'Not specified';

    const date = new Date(dateTimeStr);

    if (isAllDay) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to render meeting links
  const renderMeetingLinks = (conferenceData: EventConferenceData | undefined) => {
    if (!conferenceData || !conferenceData.entryPoints) return null;

    return (
      <div className="mt-3 space-y-2">
        <h4 className="text-sm font-semibold text-white">Meeting Links:</h4>
        {conferenceData.entryPoints.map((entry, index) => (
          <a
            key={index}
            href={entry.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-blue-400 hover:text-blue-300"
          >
            {entry.entryPointType === 'video' && <Video size={14} className="mr-1" />}
            {entry.entryPointType === 'phone' && <Phone size={14} className="mr-1" />}
            {entry.entryPointType === 'more' && <MoreHorizontal size={14} className="mr-1" />}
            {entry.label || entry.entryPointType}
          </a>
        ))}
      </div>
    );
  };

  // Function to view event details
  const handleViewEventDetails = async (eventId: string) => {
    try {
      setIsLoadingEventDetail(true);

      // Find the event in the current events array
      const existingEvent = calendarEvents.find(event => event.id === eventId);

      if (existingEvent) {
        setSelectedEvent(existingEvent);
        setIsEventDetailOpen(true);
      } else {
        setCalendarError('Event not found');
      }
    } catch (error) {
      console.error('Error viewing event details:', error);
      setCalendarError('Failed to load event details');
    } finally {
      setIsLoadingEventDetail(false);
    }
  };

  // Load all history without pagination
  const loadHistory = async (forceRefresh = false) => {
    if (!selectedVoice || !selectedApiKeyProfile) return;

    try {
      setIsLoadingHistory(true);
      setHistoryError('');

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

  // Update the loadCalendarEvents function to handle the new auth flow with better debugging
  const loadCalendarEvents = async () => {
    debugger;
    try {
      setIsCalendarLoading(true);
      setCalendarError('');

      // Add this for clearer debugging
      console.log(`Loading calendar events for month: ${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`);

      const startDate = new Date(selectedDate);
      startDate.setDate(1); // First day of month
      startDate.setHours(0, 0, 0, 0); // Start of day

      const endDate = new Date(selectedDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of month
      endDate.setHours(23, 59, 59, 999); // End of day

      console.log(`Date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

      // Check if we're signed in first to avoid unnecessary API calls
      const isSignedIn = await isUserSignedIn();
      if (!isSignedIn) {
        console.log("User not signed in, cannot load calendar events");
        setIsCalendarSignedIn(false);
        setCalendarEvents([]);
        setIsCalendarLoading(false);
        return;
      }

      // getCalendarEvents will now handle requesting a token if needed
      const events = await getCalendarEvents(startDate, endDate);
      console.log(`Received ${events.length} events from API`);

      // Make sure we update the state with the new events
      setCalendarEvents(events);

      // Update sign-in status after fetching events
      setIsCalendarSignedIn(true);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      setCalendarError('Failed to load events from Google Calendar.');

      // If it's an authentication error, update the sign-in status
      if (error && typeof error === 'object') {
        const errorObj = error as Record<string, any>;
        if (errorObj.status === 401 || (errorObj.message && typeof errorObj.message === 'string' && errorObj.message.includes('auth'))) {
          setIsCalendarSignedIn(false);
        }
      }
    } finally {
      setIsCalendarLoading(false);
    }
  };

  // Updated function to handle Google sign-in with better popup blocking detection
  const handleCalendarSignIn = async () => {
    try {
      setCalendarError('');
      setIsCalendarLoading(true);

      // Start sign-in process with better error handling
      try {
        await signInWithGoogle();

        // If we successfully initiated the sign-in, check for completion
        let attempts = 0;
        const maxAttempts = 10;
        const checkInterval = setInterval(async () => {
          attempts++;
          console.log(`Checking sign-in status (attempt ${attempts}/${maxAttempts})...`);

          const signedIn = await isUserSignedIn();
          console.log(`Sign-in status check result: ${signedIn}`);

          if (signedIn) {
            // Success - clear interval and proceed
            console.log("Sign-in successful!");
            clearInterval(checkInterval);
            setIsCalendarSignedIn(true);
            loadCalendarEvents();
            setIsCalendarLoading(false);
          }
          else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            setCalendarError('Sign-in timed out. Please try again and ensure popups are allowed for this site.');
            setIsCalendarLoading(false);
          }
        }, 1000);
      } catch (signInError) {
        // Properly type the signInError
        const error = signInError as Record<string, any>;

        // Check for specific error types from our enhanced signInWithGoogle function
        if (error && typeof error === 'object') {
          if (error.type === 'POPUP_BLOCKED') {
            setCalendarError(
              'Your browser blocked the sign-in popup. Please allow popups for this site in your browser settings and try again.'
            );
          } else if (error.error) {
            setCalendarError(`Google sign-in error: ${error.error}`);
          } else {
            setCalendarError('Failed to start Google sign-in process. Please try again.');
          }
        } else {
          setCalendarError('Failed to start Google sign-in process. Please try again.');
        }
        setIsCalendarLoading(false);
      }
    } catch (error) {
      console.error('Error in sign-in process:', error);
      setCalendarError('An unexpected error occurred during sign-in. Please check console for details and try again.');
      setIsCalendarLoading(false);
    }
  };

  // Function to handle Google sign out
  const handleCalendarSignOut = async () => {
    try {
      await signOutFromGoogle();
      setIsCalendarSignedIn(false);
      setCalendarEvents([]);
    } catch (error) {
      console.error('Error signing out from Google:', error);
      setCalendarError('Failed to sign out from Google');
    }
  };

  // Enhanced function to add event with details
  const handleAddEventWithDetails = async () => {
    if (!newEventTitle || !newEventDate || !newEventTime) {
      setCalendarError('Please fill in all event fields');
      return;
    }

    try {
      setIsCalendarLoading(true);
      setCalendarError('');

      const eventDateTime = new Date(`${newEventDate}T${newEventTime}`);

      await addCalendarEvent({
        summary: newEventTitle,
        location: newEventLocation,
        description: newEventDescription,
        start: {
          dateTime: eventDateTime.toISOString()
        },
        end: {
          dateTime: new Date(eventDateTime.getTime() + 60 * 60 * 1000).toISOString() // 1 hour later
        }
      });

      // Reset form
      setNewEventTitle('');
      setNewEventDate('');
      setNewEventTime('');
      setNewEventLocation('');
      setNewEventDescription('');
      setShowAddEvent(false);

      // Reload events
      await loadCalendarEvents();
    } catch (error) {
      console.error('Error adding event:', error);
      setCalendarError('Failed to add event to Google Calendar');
    } finally {
      setIsCalendarLoading(false);
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
      setVoiceError('');

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
      const selectedVoiceDetails = availableVoices.find(voice => voice.voiceId === selectedVoice);

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
      setGenerationStatus('Voice generated successfully!');

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
      setImageError('');

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
      setHistoryError('');

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
        `${historyItem.voice_name || "voice"}-${historyItem.history_item_id
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
      if (storedParams.styleExaggeration !== undefined) setStyleExaggeration(storedParams.styleExaggeration);
      if (storedParams.speakerBoost !== undefined) setSpeakerBoost(storedParams.speakerBoost);
      if (storedParams.modelId !== undefined) setSelectedModelId(storedParams.modelId);

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
      ? text.substring(0, maxLength) + '...'
      : (text || '');
  };

  const extractLinksFromDescription = (description: string | null | undefined): { thumbnailUrl: string | null, driveUrl: string | null } => {
    if (!description) return { thumbnailUrl: null, driveUrl: null };

    // Extract thumbnail URL
    const thumbnailMatch = description.match(/https:\/\/lh3\.googleusercontent\.com\/[^\s]+/);
    const thumbnailUrl = thumbnailMatch ? thumbnailMatch[0] : null;

    // Extract Drive WebView Link
    const driveMatch = description.match(/https:\/\/drive\.google\.com\/file\/[^\s]+/);
    const driveUrl = driveMatch ? driveMatch[0] : null;

    return { thumbnailUrl, driveUrl };
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
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
           <img src="/tasty-logo.png" alt="logo" width={32} height={32} />
          </div>
          <h1 className="text-xl font-bold">Tasty Creative</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-300 text-sm">
            Welcome, {displayName}
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
        <Tabs defaultValue={tabValue} className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-6 mb-6 bg-black/30 backdrop-blur-lg rounded-full p-1 border border-white/10">
            <TabsTrigger
              value="dashboard"
              className="text-sm rounded-full text-white data-[state=active]:text-black data-[state=active]:bg-white relative px-3 py-1.5 flex items-center justify-center"
            >
              <CalendarIcon size={16} className="sm:mr-1" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger
              value="generate"
              className="text-sm rounded-full text-white data-[state=active]:text-black data-[state=active]:bg-white relative px-3 py-1.5"
            >
              <PencilRuler />
              <span className="hidden sm:inline">Generate</span>
            </TabsTrigger>
            {/* <TabsTrigger
              value="vip"
              className="text-sm rounded-full text-white data-[state=active]:text-black data-[state=active]:bg-white relative px-3 py-1.5"
            >
              <Star size={16} className="sm:mr-1" />
              <span className="hidden sm:inline">VIP</span>
            </TabsTrigger>
            <TabsTrigger
              value="game"
              className="text-sm rounded-full text-white data-[state=active]:text-black data-[state=active]:bg-white relative px-3 py-1.5"
            >
              <div className="sm:mr-1">🎮</div>
              <span className="hidden sm:inline">Game</span>
            </TabsTrigger>
            <TabsTrigger
              value="ftt"
              className="text-sm rounded-full text-white data-[state=active]:text-black data-[state=active]:bg-white relative px-3 py-1.5"
            >
              <CircleDollarSign />
              <span className="hidden sm:inline">FTT</span>
            </TabsTrigger>
            <TabsTrigger
              value="twitter"
              className="text-sm rounded-full text-white data-[state=active]:text-black data-[state=active]:bg-white relative px-3 py-1.5"
            >
              <Twitter />
              <span className="hidden sm:inline">Twitter Ads</span>
            </TabsTrigger> */}
            {/* <TabsTrigger
              value="image"
              className="text-sm rounded-full text-white data-[state=active]:text-black data-[state=active]:bg-white relative px-3 py-1.5"
            >
              <Image size={16} className="sm:mr-1" />
              <span className="hidden sm:inline">AI Image</span>
            </TabsTrigger> */}
            <TabsTrigger
              value="voice"
              className="text-sm rounded-full text-white data-[state=active]:text-black data-[state=active]:bg-white relative px-3 py-1.5"
            >
              <Mic size={16} className="sm:mr-1" />
              <span className="hidden sm:inline">AI Voice</span>
            </TabsTrigger>
            <TabsTrigger
              value="model"
              className="text-sm rounded-full text-white data-[state=active]:text-black data-[state=active]:bg-white relative px-3 py-1.5"
            >
              <UsersRound size={16} className="sm:mr-1" />
              <span className="hidden sm:inline">Models</span>
            </TabsTrigger>
            <TabsTrigger
              value="onboarding"
              className="text-sm rounded-full text-white data-[state=active]:text-black data-[state=active]:bg-white relative px-3 py-1.5"
            >
              <Clapperboard size={16} className="sm:mr-1" />
              <span className="hidden sm:inline">Onboarding</span>
            </TabsTrigger>
            <TabsTrigger
              value="chatting"
              className="text-sm rounded-full text-white data-[state=active]:text-black data-[state=active]:bg-white relative px-3 py-1.5"
            >
              <MessageSquareText size={16} className="sm:mr-1" />
              <span className="hidden sm:inline">Chatting</span>
            </TabsTrigger>
          </TabsList>

          {/* Calendar Tab */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar Controls */}
              <Card className="lg:col-span-2 bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
                {/* Calendar Header */}
               {Array.isArray(notifications) && (
                <div className='px-5'>
                  {notifications.map((notification:NotificationData, index:number) => (
                    <div
                      className='py-1'
                      key={index}>
                      <LaunchPrepDetails              
                        modelDataLoading={false} // Replace with actual loading state if needed
                        selectedModelData={notification.editedData} // Passing the `editedData` from the notificationication
                        timestamp={notification.timestamp} // Passing the timestamp
                        editedBy={notification.editedBy} // Passing the editor's name
                        className="bg-black/20 dark"
                        dashboard={true} // Pass the dashboard prop to the component
                        triggerTabChange={triggerTabChange} // Pass the handleTabChange function to the component
                      />
                  </div>
                  ))}
                </div>
               )}
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-white">Calendar</CardTitle>
                    <CardDescription className="text-gray-400">
                      View public calendar events
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Month selector */}
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-black/60 border-white/10 text-white"
                      onClick={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setSelectedDate(newDate);
                      }}
                    >
                      <ChevronLeft size={16} />
                    </Button>

                    <h3 className="text-white text-lg font-semibold">
                      {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>

                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-black/60 border-white/10 text-white"
                      onClick={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setSelectedDate(newDate);
                      }}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-gray-400 text-sm py-2">{day}</div>
                    ))}

                    {(() => {
                      const days = [];
                      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                      const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();

                      // Add empty cells for days before the first day of the month
                      for (let i = 0; i < date.getDay(); i++) {
                        days.push(
                          <div key={`empty-${i}`} className="h-16 bg-black/20 rounded-md"></div>
                        );
                      }

                      // Add cells for each day of the month
                      for (let i = 1; i <= lastDay; i++) {
                        const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
                        // Get events for this day
                        const dayEvents = calendarEvents.filter(event => {
                          const eventDateString = event.start.dateTime || event.start.date;
                          if (!eventDateString) return false;

                          const eventDate = new Date(eventDateString);
                          return eventDate.getDate() === i &&
                            eventDate.getMonth() === currentDate.getMonth() &&
                            eventDate.getFullYear() === currentDate.getFullYear();
                        });

                        days.push(
                          <div
                            key={i}
                            className={`h-16 p-1 rounded-md text-white relative overflow-hidden ${dayEvents.length > 0 ? 'bg-purple-900/30 border border-purple-500/30' : 'bg-black/20'}`}
                          >
                            <div className="text-right text-sm mb-1">{i}</div>
                            <div className="overflow-y-auto text-xs h-10">
                              {dayEvents.map((event, idx) => (
                                <button
                                  key={idx}
                                  className="w-full text-left truncate bg-blue-800/40 hover:bg-blue-700/40 rounded px-1 py-0.5 mb-0.5 transition-colors"
                                  title={event.summary}
                                  onClick={() => event.id ? handleViewEventDetails(event.id) : undefined}
                                  disabled={!event.id}
                                >
                                  {event.summary}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      return days;
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Right Panel - Events Panel */}
              <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white">Events Panel</CardTitle>
                  <CardDescription className="text-gray-400">
                    Public calendar events
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {isCalendarLoading ? (
                    <div className="flex justify-center items-center p-8">
                      <Loader2 size={24} className="animate-spin text-purple-400" />
                    </div>
                  ) : calendarEvents.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {calendarEvents
                        .sort((a, b) => {
                          const dateAStr = a.start.dateTime || a.start.date;
                          const dateBStr = b.start.dateTime || b.start.date;

                          // Handle undefined dates for sorting
                          if (!dateAStr && !dateBStr) return 0;
                          if (!dateAStr) return 1;  // Put items with no date at the end
                          if (!dateBStr) return -1; // Put items with no date at the end

                          const dateA = new Date(dateAStr);
                          const dateB = new Date(dateBStr);
                          return dateA.getTime() - dateB.getTime();
                        })
                        .map((event, index) => {
                          // Safely handle dates
                          const eventDateStr = event.start.dateTime || event.start.date;
                          if (!eventDateStr) return null; // Skip events with no date

                          const eventDate = new Date(eventDateStr);
                          const isAllDay = !!event.start.date;
                          const isPast = eventDate < new Date();

                          // Get time of day or "All day"
                          const timeStr = isAllDay
                            ? "All day"
                            : eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                          return (
                            <button
                              key={index}
                              className={`w-full p-3 border rounded-lg text-left transition-colors ${isPast
                                ? "border-gray-700/30 bg-black/40 opacity-60"
                                : "border-white/10 bg-black/40 hover:bg-black/60"
                                }`}
                              onClick={() => event.id ? handleViewEventDetails(event.id) : undefined}
                              disabled={!event.id}
                            >
                              <div className="flex items-start">
                                {/* Date box */}
                                <div className="min-w-14 w-14 bg-black/40 rounded text-center p-1 mr-3">
                                  <div className="text-xs text-gray-400">
                                    {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                                  </div>
                                  <div className="text-xl font-bold text-white">
                                    {eventDate.getDate()}
                                  </div>
                                </div>

                                {/* Event details */}
                                <div className="flex-1">
                                  <div className="font-medium text-white mb-1 line-clamp-1">{event.summary}</div>
                                  <div className="text-xs text-gray-400 flex items-center mb-1">
                                    <Clock size={10} className="mr-1" />
                                    {timeStr}
                                  </div>

                                  {/* Show additional details */}
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {event.location && (
                                      <div className="text-xs text-gray-400 flex items-center max-w-full">
                                        <MapPin size={10} className="mr-1 flex-shrink-0" />
                                        <span className="truncate">{event.location}</span>
                                      </div>
                                    )}

                                    {event.attendees && event.attendees.length > 0 && (
                                      <div className="text-xs text-gray-400 flex items-center">
                                        <Users size={10} className="mr-1" />
                                        {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                                      </div>
                                    )}

                                    {event.conferenceData && (
                                      <div className="text-xs text-purple-400 flex items-center">
                                        <Video size={10} className="mr-1" />
                                        Virtual meeting
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Status indicator */}
                                {event.status && (
                                  <div className={`ml-2 h-2 w-2 rounded-full flex-shrink-0 ${event.status === 'confirmed' ? 'bg-green-500' :
                                    event.status === 'cancelled' ? 'bg-red-500' :
                                      'bg-yellow-500'
                                    }`} />
                                )}
                              </div>
                            </button>
                          );
                        })
                        // Filter out null values from map function
                        .filter(item => item !== null)}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-white/10 rounded-lg bg-black/20">
                      <CalendarIcon size={32} className="mx-auto mb-3 text-gray-500 opacity-50" />
                      <p className="text-gray-400 mb-1">
                        No events found for this month
                      </p>
                      <p className="text-xs text-gray-500">
                        Try changing the month to see other events
                      </p>
                    </div>
                  )}

                  {/* Error display */}
                  {calendarError && (
                    <Alert variant="destructive" className="mt-4 bg-red-900/20 border-red-500/30 text-red-200">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {calendarError}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Event Detail Dialog - Remains the same except for auth-related parts */}
            <Dialog open={isEventDetailOpen} onOpenChange={setIsEventDetailOpen}>
              <DialogContent
                className="bg-black/90 backdrop-blur-xl border border-purple-500/20 text-white 
      w-[90%] sm:w-[80%] md:w-[70%] lg:w-[60%] max-w-2xl 
      rounded-xl shadow-xl overflow-hidden"
              >
                {isLoadingEventDetail ? (
                  <div className="flex justify-center items-center py-16">
                    <Loader2 size={36} className="animate-spin text-purple-400" />
                  </div>
                ) : selectedEvent ? (
                  <>
                    <DialogHeader className="pb-4 border-b border-white/10">
                      <DialogTitle className="text-2xl font-bold text-white flex items-start gap-3">
                        <span className="mr-2">{selectedEvent.summary}</span>
                        {selectedEvent.colorId && (
                          <div
                            className="w-4 h-4 rounded-full mt-2 flex-shrink-0"
                            style={{
                              backgroundColor: selectedEvent.colorId === "1" ? "#7986cb" :
                                selectedEvent.colorId === "2" ? "#33b679" :
                                  selectedEvent.colorId === "3" ? "#8e24aa" :
                                    selectedEvent.colorId === "4" ? "#e67c73" :
                                      selectedEvent.colorId === "5" ? "#f6c026" :
                                        selectedEvent.colorId === "6" ? "#f5511d" :
                                          selectedEvent.colorId === "7" ? "#039be5" :
                                            selectedEvent.colorId === "8" ? "#616161" :
                                              selectedEvent.colorId === "9" ? "#3f51b5" :
                                                selectedEvent.colorId === "10" ? "#0b8043" :
                                                  selectedEvent.colorId === "11" ? "#d50000" : "#4285f4",
                            }}
                          />
                        )}
                      </DialogTitle>

                      <div className="mt-2">
                        {selectedEvent.status === 'confirmed' ? (
                          <span className="inline-flex items-center bg-green-900/50 text-green-300 text-xs px-3 py-1 rounded-full border border-green-600/30">
                            <Check size={12} className="mr-1" /> Confirmed
                          </span>
                        ) : selectedEvent.status === 'cancelled' ? (
                          <span className="inline-flex items-center bg-red-900/50 text-red-300 text-xs px-3 py-1 rounded-full border border-red-600/30">
                            <X size={12} className="mr-1" /> Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-yellow-900/50 text-yellow-300 text-xs px-3 py-1 rounded-full border border-yellow-600/30">
                            <Clock size={12} className="mr-1" /> Tentative
                          </span>
                        )}
                      </div>
                    </DialogHeader>
                    <div className="py-4 space-y-6 max-h-[50vh] md:max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                      {/* Date and Time */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
                          <CalendarIcon size={14} className="mr-2 text-purple-400" />
                          Date & Time
                        </h3>
                        <div className="bg-black/60 rounded-lg p-4 border border-purple-500/20">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-10 h-10 bg-purple-900/40 rounded-full flex items-center justify-center mr-4">
                              <CalendarIcon size={20} className="text-purple-300" />
                            </div>
                            <div>
                              {selectedEvent.start.date ? (
                                // All-day event
                                <p className="text-white text-lg">
                                  {formatDateTime(selectedEvent.start.date, true)}
                                  {selectedEvent.end && selectedEvent.end.date &&
                                    new Date(selectedEvent.start.date).toDateString() !== new Date(selectedEvent.end.date).toDateString() && (
                                      <> to {formatDateTime(selectedEvent.end.date, true)}</>
                                    )}
                                  <span className="ml-2 text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                                    All day
                                  </span>
                                </p>
                              ) : (
                                // Timed event
                                <p className="text-white text-lg">
                                  {formatDateTime(selectedEvent.start.dateTime)}
                                  {selectedEvent.end && selectedEvent.end.dateTime && (
                                    <> to {formatDateTime(selectedEvent.end.dateTime)}</>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Google Drive Link */}
                      {selectedEvent.description && (() => {
                        const driveMatch = selectedEvent.description.match(/WebView Link:\s*https:\/\/drive\.google\.com\/file\/d\/([^/]+)\/[^\s]+/i);
                        const fileId = driveMatch && driveMatch[1];

                        if (!fileId) return null;

                        const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;
                        const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;

                        return (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
                              <FileText size={14} className="mr-2 text-purple-400" />
                              File Preview
                            </h3>
                            <div className="bg-black/60 rounded-lg p-4 border border-purple-500/20">
                              <div className="w-full">
                                <div className="relative w-full pb-[56.25%] overflow-hidden rounded-lg bg-black/60 border border-purple-500/20 mb-3">
                                  <iframe
                                    src={embedUrl}
                                    className="absolute top-0 left-0 w-full h-full"
                                    frameBorder="0"
                                    allowFullScreen
                                    title="Google Drive File Preview"
                                  ></iframe>
                                </div>

                                <a
                                  href={driveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors"
                                >
                                  <ExternalLink size={16} className="mr-2" />
                                  Open in Google Drive
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Description */}
                      {selectedEvent.description && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
                            <FileText size={14} className="mr-2 text-purple-400" />
                            Description
                          </h3>
                          <div className="bg-black/60 rounded-lg p-4 border border-purple-500/20 max-h-60 overflow-y-auto">
                            <div className="prose prose-sm prose-invert max-w-none">
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: selectedEvent.description
                                    .replace(/Thumbnail:\s*https:\/\/[^\n]+\n?/gi, '')
                                    .replace(/WebView Link:\s*https:\/\/[^\n]+\n?/gi, '')
                                    .replace(/Model:\s*[^\n]+\n?/gi, '')
                                    .replace(
                                      /(https?:\/\/[^\s]+)/g,
                                      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 break-all">$1</a>'
                                    )
                                    .replace(/\n/g, '<br />'),
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Location */}
                      {selectedEvent.location && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
                            <MapPin size={14} className="mr-2 text-purple-400" />
                            Location
                          </h3>
                          <div className="bg-black/60 rounded-lg p-4 border border-purple-500/20">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-10 h-10 bg-purple-900/40 rounded-full flex items-center justify-center mr-4">
                                <MapPin size={20} className="text-purple-300" />
                              </div>
                              <p className="text-white">{selectedEvent.location}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Conference Data */}
                      {selectedEvent.conferenceData && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
                            <Video size={14} className="mr-2 text-purple-400" />
                            Virtual Meeting
                          </h3>
                          <div className="bg-black/60 rounded-lg p-4 border border-purple-500/20">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 w-10 h-10 bg-purple-900/40 rounded-full flex items-center justify-center mr-4">
                                <Video size={20} className="text-purple-300" />
                              </div>
                              <div>
                                <p className="text-white font-medium">
                                  {selectedEvent.conferenceData.conferenceSolution?.name || 'Virtual Meeting'}
                                </p>
                                {renderMeetingLinks(selectedEvent.conferenceData)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Attendees */}
                      {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
                            <Users size={14} className="mr-2 text-purple-400" />
                            Attendees ({selectedEvent.attendees.length})
                          </h3>
                          <div className="bg-black/60 rounded-lg p-4 border border-purple-500/20 max-h-60 overflow-y-auto">
                            <ul className="space-y-3">
                              {selectedEvent.attendees.map((attendee, index) => (
                                <li key={index} className="flex items-center justify-between bg-black/30 p-2 rounded-lg border border-white/5">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mr-3">
                                      <span className="text-xs font-bold text-white">
                                        {attendee.displayName
                                          ? attendee.displayName[0].toUpperCase()
                                          : attendee.email[0].toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-white text-sm font-medium">
                                        {attendee.displayName || attendee.email}
                                      </span>
                                      <div className="flex gap-1 mt-1">
                                        {attendee.organizer && (
                                          <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                                            Organizer
                                          </span>
                                        )}
                                        {attendee.self && (
                                          <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                                            You
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full ${attendee.responseStatus === 'accepted'
                                      ? 'bg-green-900/30 text-green-300 border border-green-500/30'
                                      : attendee.responseStatus === 'declined'
                                        ? 'bg-red-900/30 text-red-300 border border-red-500/30'
                                        : attendee.responseStatus === 'tentative'
                                          ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-500/30'
                                          : 'bg-gray-900/30 text-gray-300 border border-gray-500/30'
                                      }`}
                                  >
                                    {attendee.responseStatus === 'accepted'
                                      ? 'Accepted'
                                      : attendee.responseStatus === 'declined'
                                        ? 'Declined'
                                        : attendee.responseStatus === 'tentative'
                                          ? 'Maybe'
                                          : 'Pending'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Creator/Organizer */}
                      {(selectedEvent.creator || selectedEvent.organizer) && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
                            <User size={14} className="mr-2 text-purple-400" />
                            Created by
                          </h3>
                          <div className="bg-black/60 rounded-lg p-4 border border-purple-500/20">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-10 h-10 bg-purple-900/40 rounded-full flex items-center justify-center mr-4">
                                <User size={20} className="text-purple-300" />
                              </div>
                              <p className="text-white">
                                {selectedEvent.creator?.displayName ||
                                  selectedEvent.creator?.email ||
                                  selectedEvent.organizer?.displayName ||
                                  selectedEvent.organizer?.email ||
                                  'Unknown'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-2 border-t border-white/10 flex justify-between items-center">
                      {selectedEvent.htmlLink && (
                        <a
                          href={selectedEvent.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <ExternalLink size={14} className="mr-2" /> View in Google Calendar
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <CalendarIcon size={48} className="mx-auto text-gray-500 opacity-50 mb-4" />
                    <p className="text-gray-400 text-lg">Event details not available</p>
                    <DialogClose asChild>
                      <Button className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0">
                        Close
                      </Button>
                    </DialogClose>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Other tabs content remains the same */}
          <TabsContent value="generate">
            {/* <LiveFlyer /> */}
            <GenerationTab />
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
                      <div className={`rounded-full w-3 h-3 ${comfyUIStatus === 'connected' ? 'bg-green-500' :
                        comfyUIStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                        } mr-2`}></div>
                      <span className="text-sm">
                        {comfyUIStatus === 'connected' ? 'Connected to RunPod' :
                          comfyUIStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
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
                    <Label htmlFor="sampler-selection" className="text-gray-300 mb-1 block">Sampler</Label>
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
                    <Label htmlFor="model-selection" className="text-gray-300 mb-1 block">Select AI Model</Label>
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

                <CardContent className="flex flex-col h-96"> {/* Fixed height container with room for history toggle */}
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
                          {selectedHistoryItem.text && selectedHistoryItem.text.length > 60
                            ? selectedHistoryItem.text.substring(0, 60) + '...'
                            : selectedHistoryItem.text || ''}
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
                        <h3 className="text-sm font-medium text-gray-300">History</h3>

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
                                    <p className="text-gray-400">Generated: {formatDate(item.date_unix * 1000)}</p>

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
            <VIPFlyer />
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

          <TabsContent value="model">
            <ModelPage />
          </TabsContent>

          <TabsContent value="ftt">
            <FTTPage />
          </TabsContent>

          <TabsContent value="twitter">
            <TwitterAdsPage />
          </TabsContent>

          <TabsContent value="chatting">
            <ChattingTab  />
          </TabsContent>

          <TabsContent value="onboarding">
            <OnboardingTab  />
          </TabsContent>
        </Tabs>
      </div>

      {/* Status Bar */}
      <div className="mt-auto bg-black/20 backdrop-blur-md p-2 text-sm text-gray-400 border-t border-white/5 relative z-10">
        <div className="container mx-auto flex justify-between">
          <div>Tasty Creative v1.0</div>
          <div>
            Status:
            {activeTab === 'image' && (
              <span className={`ml-1 ${comfyUIStatus === 'connected' ? 'text-green-400' : 'text-yellow-400'}`}>
                RunPod ComfyUI {comfyUIStatus === 'connected' ? '(Connected)' : '(Disconnected)'}
              </span>
            )}
            {activeTab === "voice" && (
              <span className="text-green-400 ml-1">
                ElevenLabs
                {apiKeyBalance && <span className="ml-1">({apiKeyBalance?.character?.remaining !== undefined ? apiKeyBalance.character.remaining.toLocaleString() : 'N/A'} chars)</span>}
              </span>
            )}
            {activeTab === 'calendar' && (
              <span className="ml-1">
                Calendar
              </span>
            )}
            {activeTab === 'live' && (
              <span className="ml-1">
                Live
              </span>
            )}
            {(activeTab !== 'image' && activeTab !== 'voice' && activeTab !== 'calendar' && activeTab !== 'live') && (
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