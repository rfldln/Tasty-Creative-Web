// services/elevenlabs-implementation.js

// Pre-configured profiles WITHOUT API keys
export const API_KEY_PROFILES = {
  account_1: { 
    name: "OF Bri's voice", 
    description: 'Main account with professional voice access',
    voices: [
      // Professional female voices
      { name: 'OF Bri', voiceId: 'XtrZA2v40BnLkNsO4MbN', category: 'professional' },
    ]
  },
  account_2: { 
    name: "OF Coco's voice", 
    description: 'Backup account for high-volume usage',
    voices: [
      { name: 'OF Coco', voiceId: 'oT9QD0CuqG8lLK2X4bY3', category: 'professional' },
    ]
  },
  account_3: { 
    name: "OF Mel's voice", 
    description: 'Backup account for high-volume usage',
    voices: [
      { name: 'OF Mel', voiceId: 'oPCTXWLNPjuUYQCRVrwA', category: 'professional' },
    ]
  },
  account_4: { 
    name: "OF Lala's voice", 
    description: 'Backup account for high-volume usage',
    voices: [
      { name: 'OF Lala', voiceId: 'pFxPgV5pV6WbTBIfVh0M', category: 'professional' },
    ]
  },
  account_5: { 
    name: "OF Bronwin's voice", 
    description: 'Backup account for high-volume usage',
    voices: [
      { name: 'OF Bronwin', voiceId: 'rFfKB0Jvn1Pj082TgJl2', category: 'professional' },
    ]
  },
};

// Available ElevenLabs models
export const ELEVEN_LABS_MODELS = [
  { name: 'Multilingual v2', id: 'eleven_multilingual_v2', description: 'Best quality multilingual model' },
  { name: 'Monolingual v1', id: 'eleven_monolingual_v1', description: 'Optimized for single language' },
  { name: 'Turbo v2', id: 'eleven_turbo_v2', description: 'Fastest generation, good quality' },
  { name: 'Enhanced', id: 'eleven_enhanced', description: 'Best quality for English' },
  { name: 'Multilingual v1', id: 'eleven_multilingual_v1', description: 'Legacy multilingual model' }
];

// Cache for history audio URLs
const audioUrlCache = new Map();

// Store for voice generation parameters
const voiceParametersCache = new Map();

// Function to store voice parameters with the historyItemId
export function storeVoiceParameters(historyItemId, parameters) {
  voiceParametersCache.set(historyItemId, parameters);
  
  // Also save to localStorage for persistence
  try {
    const allParams = JSON.parse(localStorage.getItem('voiceParametersCache') || '{}');
    allParams[historyItemId] = parameters;
    localStorage.setItem('voiceParametersCache', JSON.stringify(allParams));
  } catch (error) {
    console.error('Error saving parameters to localStorage:', error);
  }
}

// Function to get stored parameters for a history item
export function getVoiceParameters(historyItemId) {
  // Try from memory cache first
  if (voiceParametersCache.has(historyItemId)) {
    return voiceParametersCache.get(historyItemId);
  }
  
  // Try from localStorage next
  try {
    const allParams = JSON.parse(localStorage.getItem('voiceParametersCache') || '{}');
    if (allParams[historyItemId]) {
      // Also update in-memory cache
      voiceParametersCache.set(historyItemId, allParams[historyItemId]);
      return allParams[historyItemId];
    }
  } catch (error) {
    console.error('Error retrieving parameters from localStorage:', error);
  }
  
  return null;
}

// Load parameters from localStorage on initialization
export function initVoiceParametersCache() {
  try {
    const allParams = JSON.parse(localStorage.getItem('voiceParametersCache') || '{}');
    Object.entries(allParams).forEach(([historyItemId, parameters]) => {
      voiceParametersCache.set(historyItemId, parameters);
    });
  } catch (error) {
    console.error('Error loading parameters from localStorage:', error);
  }
}

// Function to get the appropriate API key profile (no longer returns actual API key)
export function getApiKey(profileKey) {
  return API_KEY_PROFILES[profileKey] ? profileKey : '';
}

// Function to get voices for a specific API key profile
export function getVoicesForProfile(profileKey) {
  return API_KEY_PROFILES[profileKey]?.voices || [];
}

// Last fetched history items cache to prevent ElevenLabs rate limiting
let lastFetchedHistoryCache = {
  apiKey: null,
  timestamp: 0,
  data: null
};

// Function to get history from ElevenLabs API via API route
export async function fetchHistoryFromElevenLabs(apiKeyProfile, voiceId, pageSize = 20, pageIndex = 1, forceRefresh = false) {
  if (!apiKeyProfile) {
    throw new Error('Invalid API key profile');
  }

  // Check if we can use cached history (within 5 seconds and same API key)
  const now = Date.now();
  const canUseCachedHistory = !forceRefresh && 
                             lastFetchedHistoryCache.apiKey === apiKeyProfile && 
                             now - lastFetchedHistoryCache.timestamp < 5000 && 
                             lastFetchedHistoryCache.data;

  if (canUseCachedHistory) {
    // Use the cached data
    return lastFetchedHistoryCache.data;
  } else {
    try {
      // Use the API route instead of direct ElevenLabs API call
      const response = await fetch('/api/elevenlabs/fetch-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKeyProfileKey: apiKeyProfile,
          voiceId,
          pageSize,
          pageIndex,
          forceRefresh
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch history: ${response.status}`);
      }

      const data = await response.json();
      
      // Update cache
      lastFetchedHistoryCache = {
        apiKey: apiKeyProfile,
        timestamp: now,
        data: data
      };
      
      return data;
    } catch (error) {
      console.error('Error fetching history from ElevenLabs:', error);
      throw error;
    }
  }
}

// Function to manually add a new history item
export async function forceRefreshHistory() {
  // Invalidate the cache to force a refresh on next fetch
  lastFetchedHistoryCache.timestamp = 0;
}

// Function to get audio for a specific history item
export async function getHistoryAudio(apiKeyProfile, historyItemId) {
  // Check cache first
  if (audioUrlCache.has(historyItemId)) {
    return audioUrlCache.get(historyItemId);
  }

  if (!apiKeyProfile) {
    throw new Error('Invalid API key profile');
  }

  try {
    // Use the API route instead of direct ElevenLabs API call
    const response = await fetch('/api/elevenlabs/history-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKeyProfileKey: apiKeyProfile,
        historyItemId
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `Failed to fetch history audio: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Cache the URL
    audioUrlCache.set(historyItemId, {
      audioUrl,
      audioBlob
    });
    
    return {
      audioUrl,
      audioBlob
    };
  } catch (error) {
    console.error('Error fetching history audio from ElevenLabs:', error);
    throw error;
  }
}

// Function to generate voice using API route
export async function generateVoice(apiKeyProfileKey, voiceId, text, modelId, settings) {
  if (!apiKeyProfileKey) {
    throw new Error('Invalid API key profile');
  }
  
  try {
    const response = await fetch('/api/elevenlabs/generate-voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKeyProfileKey,
        voiceId,
        text,
        modelId,
        settings
      }),
    });

    if (!response.ok) {
      // Try to parse error response as JSON
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate voice');
      } catch (e) {
        // If not JSON, use status text
        throw new Error(`Failed to generate voice: ${response.statusText}`);
      }
    }

    // Get the audio blob directly
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Find the voice details
    const voice = getVoicesForProfile(apiKeyProfileKey).find(v => v.voiceId === voiceId);
    
    // Force refresh the history cache to ensure new item is picked up
    lastFetchedHistoryCache.timestamp = 0;
    
    // After a successful generation, wait a moment to get the history item ID
    setTimeout(async () => {
      try {
        const history = await fetchHistoryFromElevenLabs(apiKeyProfileKey, voiceId, 1, 1, true);
        if (history?.items?.length > 0) {
          const latestItem = history.items[0];
          // Store the parameters with the history item ID
          storeVoiceParameters(latestItem.history_item_id, {
            stability: settings.stability,
            clarity: settings.clarity,
            modelId: modelId,
            speed: settings.speed,
            styleExaggeration: settings.styleExaggeration,
            speakerBoost: settings.speakerBoost
          });
        }
      } catch (error) {
        console.error('Failed to store parameters:', error);
      }
    }, 1000); // Wait 1 second to ensure the history item is available
    
    return {
      audioUrl,
      audioBlob,
      profile: API_KEY_PROFILES[apiKeyProfileKey].name,
      voiceName: voice?.name || 'Unknown Voice'
    };
  } catch (error) {
    console.error('Error generating voice:', error);
    throw error;
  }
}

// Function to check API key credit balance
export async function checkApiKeyBalance(apiKeyProfileKey) {
  if (!apiKeyProfileKey) {
    throw new Error('Invalid API key profile');
  }
  
  try {
    const response = await fetch('/api/elevenlabs/check-balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKeyProfileKey
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription info');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking balance:', error);
    // Return mock data instead of throwing error
    return {
      character: {
        limit: 0,
        remaining: 0,
        used: 0
      },
      status: 'error'
    };
  }
}

// Function to download the audio file
export function downloadAudio(audioBlob, filename) {
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'generated-voice.mp3';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Helper function to clear audio URL cache
export function clearAudioUrlCache() {
  audioUrlCache.clear();
}