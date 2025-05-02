// services/google-calendar-implementation.js

// Load credentials from environment variables
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Validate required environment variables
if (!API_KEY || !CLIENT_ID) {
  console.error("Missing required environment variables for Google Calendar:");
  if (!API_KEY) console.error("- NEXT_PUBLIC_GOOGLE_API_KEY is not defined");
  if (!CLIENT_ID)
    console.error("- NEXT_PUBLIC_GOOGLE_CLIENT_ID is not defined");
}

// Calendar ID can also be moved to env variables for better security
const CALENDAR_ID = (
  process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID ||
  "2880d48fb939dfb37658d442fdc62ba6ecb31a4fc42c6d90340ccb0b1b7462ae@group.calendar.google.com"
).split(",");
// Discovery docs and scopes
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
];
const SCOPES = "https://www.googleapis.com/auth/calendar";

// Constants for localStorage
const TOKEN_STORAGE_KEY = "tasty_calendar_token";
const TOKEN_EXPIRY_KEY = "tasty_calendar_token_expiry";

// References to Google API client
let gapi = null;
let tokenClient = null;
let accessToken = null;
let isGapiInitialized = false;
let isGisLoaded = false;

/**
 * Load token from localStorage if available
 */
const loadStoredToken = () => {
  try {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (storedToken) {
      // Check if token is not expired
      if (tokenExpiry && new Date().getTime() < parseInt(tokenExpiry, 10)) {
        console.log("Using stored token from localStorage");
        accessToken = storedToken;
        return true;
      } else {
        // Token expired, clear it
        console.log("Stored token expired, clearing");
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
      }
    }
  } catch (error) {
    console.error("Error loading token from localStorage:", error);
  }
  return false;
};

/**
 * Save token to localStorage with expiry
 * @param {string} token - The access token to store
 * @param {number} expiresIn - Seconds until token expires (3600 is typical)
 */
const saveTokenToStorage = (token, expiresIn = 3600) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      // Set expiry time (current time + expiry period in ms)
      const expiryTime = new Date().getTime() + expiresIn * 1000;
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
      console.log(
        "Token saved to localStorage, expires in",
        expiresIn,
        "seconds"
      );
    }
  } catch (error) {
    console.error("Error saving token to localStorage:", error);
  }
};

/**
 * Load the GAPI script dynamically
 */
const loadGapiScript = async () => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("GAPI script loaded");
      resolve();
    };

    script.onerror = (event) => {
      console.error("GAPI script loading error", event);
      reject(new Error("Failed to load GAPI script"));
    };

    document.head.appendChild(script);
  });
};

/**
 * Load the Google Identity Services script
 */
const loadGisScript = async () => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("GIS script loaded");
      isGisLoaded = true;
      resolve();
    };

    script.onerror = (event) => {
      console.error("GIS script loading error", event);
      reject(new Error("Failed to load GIS script"));
    };

    document.head.appendChild(script);
  });
};

/**
 * Initialize the GAPI client library
 */
const initializeGapiClient = async () => {
  if (isGapiInitialized) {
    return true;
  }

  // Check if API key is available
  if (!API_KEY) {
    console.error("Cannot initialize GAPI client: API key is missing");
    return false;
  }

  try {
    // Load the client library
    await new Promise((resolve, reject) => {
      gapi.load("client", {
        callback: resolve,
        onerror: (error) => {
          console.error("Error loading client library", error);
          reject(error);
        },
        timeout: 10000, // 10 seconds
        ontimeout: () => {
          console.error("Timeout loading client library");
          reject(new Error("Timeout loading client library"));
        },
      });
    });

    // Initialize the client with API key
    await gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: DISCOVERY_DOCS,
    });

    isGapiInitialized = true;
    return true;
  } catch (error) {
    console.error("Error initializing GAPI client:", error);
    return false;
  }
};

/**
 * Set the access token for GAPI client
 */
const setupGapiWithToken = async () => {
  if (!gapi || !gapi.client) {
    console.error("GAPI client not available for token setup");
    return false;
  }

  try {
    if (accessToken) {
      // Set the token for this GAPI client session
      gapi.client.setToken({ access_token: accessToken });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error setting up GAPI with token:", error);
    return false;
  }
};

/**
 * Initialize the Google API client with the new Identity Services library
 */
export const initGoogleCalendarAuth = async () => {
  try {
    console.log("Starting Google Calendar initialization");

    // Check if required environment variables are set
    if (!API_KEY || !CLIENT_ID) {
      throw new Error(
        "Missing required environment variables for Google Calendar. Check your .env.local file."
      );
    }

    // Try to load token from storage first
    const hasStoredToken = loadStoredToken();

    // Load the GAPI script if not already loaded
    if (!window.gapi) {
      console.log("Loading GAPI script");
      await loadGapiScript();
      console.log("GAPI script loaded successfully");
    }

    gapi = window.gapi;

    // Initialize GAPI client
    const clientInitialized = await initializeGapiClient();
    if (!clientInitialized) {
      throw new Error("Failed to initialize GAPI client");
    }

    // If we have a stored token, try to set it up
    if (hasStoredToken) {
      await setupGapiWithToken();
    }

    // Load the Identity Services script if not already loaded
    if (!isGisLoaded && !window.google?.accounts?.oauth2) {
      console.log("Loading Identity Services script");
      await loadGisScript();
    }

    // Initialize the token client
    if (window.google?.accounts?.oauth2) {
      console.log("Initializing token client");
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          console.log("Token received", tokenResponse);
          if (tokenResponse && tokenResponse.access_token) {
            accessToken = tokenResponse.access_token;

            // Save token to localStorage with expiry
            saveTokenToStorage(accessToken, tokenResponse.expires_in || 3600);

            // Set up GAPI with this token
            setupGapiWithToken();
          }
        },
        error_callback: (error) => {
          console.error("Error getting token:", error);
        },
      });
    } else {
      console.warn(
        "Google Identity Services not available, sign in might not work"
      );
    }

    console.log("Google Calendar initialized successfully");
    return { success: true };
  } catch (error) {
    console.error("Error initializing Google Calendar API:", error);
    console.error(
      "Error details:",
      error?.details || error?.message || "Unknown error"
    );
    throw error;
  }
};

/**
 * Check if the user is currently signed in
 */
export const isUserSignedIn = async () => {
  // First check localStorage for a valid token
  const hasStoredToken = loadStoredToken();

  if (hasStoredToken) {
    // Verify the token works by trying to set it up with GAPI
    if (gapi && gapi.client) {
      const success = await setupGapiWithToken();
      if (success) {
        // Test if the token is actually valid by making a simple API call
        try {
          await gapi.client.calendar.calendarList.get({
            calendarId: CALENDAR_ID,
          });
          console.log("Verified token is working with API");
          return true;
        } catch (error) {
          console.warn("Stored token doesn't work with API, clearing:", error);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(TOKEN_EXPIRY_KEY);
          accessToken = null;
          return false;
        }
      }
    }
  }

  // Otherwise check the current accessToken
  return !!accessToken;
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async () => {
  // Check if CLIENT_ID is available
  if (!CLIENT_ID) {
    console.error("Cannot sign in: CLIENT_ID is missing");
    throw new Error(
      "Google Client ID not configured. Please contact the administrator."
    );
  }

  if (!tokenClient) {
    // Try to reinitialize if tokenClient is not available
    await initGoogleCalendarAuth();

    if (!tokenClient) {
      throw new Error("Google Auth not initialized properly");
    }
  }

  try {
    console.log("Starting Google sign-in process");

    // Use a Promise to handle both success and failure cases
    return new Promise((resolve, reject) => {
      try {
        // Add an error event listener to detect popup blocks
        const popupBlockedHandler = (event) => {
          if (event && event.message && event.message.includes("popup")) {
            console.warn("Popup may have been blocked:", event);
            reject({
              type: "POPUP_BLOCKED",
              message:
                "The sign-in popup was blocked by your browser. Please enable popups for this site.",
            });
          }
        };

        // Listen for errors that might indicate a popup block
        window.addEventListener("error", popupBlockedHandler);

        // Modify the token client to use redirect if needed
        const originalCallback = tokenClient.callback;
        tokenClient.callback = (response) => {
          // Remove the error listener
          window.removeEventListener("error", popupBlockedHandler);

          if (response && response.access_token) {
            accessToken = response.access_token;

            // Save token to localStorage with expiry
            saveTokenToStorage(accessToken, response.expires_in || 3600);

            // Set up GAPI with this token
            setupGapiWithToken().then(() => {
              resolve({ success: true });
            });
          } else if (response && response.error) {
            reject(response);
          } else {
            // If we got here without an error or a token, still call the original callback
            if (originalCallback) originalCallback(response);
            resolve({ success: true }); // Still consider it success as the callback might be called later
          }
        };

        // Request an access token with a timeout to catch issues
        setTimeout(() => {
          // Remove the error listener after timeout
          window.removeEventListener("error", popupBlockedHandler);
        }, 5000);

        // Try to open the popup with less restrictive settings
        tokenClient.requestAccessToken({
          prompt: "consent",
          // Use a different flow that might work better with popup blockers
          ux_mode: "popup",
          // Allow users to select accounts even if they're already signed in
          select_account: true,
        });
      } catch (innerError) {
        console.error("Error requesting token:", innerError);
        reject(innerError);
      }
    });
  } catch (error) {
    console.error("Google sign in error:", error);
    throw error;
  }
};

/**
 * Sign out from Google
 */
export const signOutFromGoogle = async () => {
  try {
    // Revoke the token if google oauth is available
    if (window.google?.accounts?.oauth2 && accessToken) {
      try {
        google.accounts.oauth2.revoke(accessToken, () => {
          console.log("Token revoked");
        });
      } catch (revokeError) {
        console.warn("Error revoking token:", revokeError);
        // Continue with signout even if revoke fails
      }
    }

    // Clear token from GAPI client
    if (gapi && gapi.client) {
      try {
        gapi.client.setToken(null);
      } catch (setTokenError) {
        console.warn("Error clearing GAPI token:", setTokenError);
      }
    }

    // Clear memory and localStorage
    accessToken = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);

    return { success: true };
  } catch (error) {
    console.error("Google sign out error:", error);
    throw error;
  }
};

/**
 * Ensure the GAPI client is initialized and authenticated
 */
const ensureAuthenticatedGapiClient = async () => {
  // Make sure GAPI is initialized
  if (!isGapiInitialized && gapi) {
    await initializeGapiClient();
  }

  // If we have a token, try to use it
  if (accessToken) {
    await setupGapiWithToken();
    return true;
  }

  // Try to load from localStorage
  if (loadStoredToken()) {
    await setupGapiWithToken();
    return true;
  }

  return false;
};

/**
 * Get calendar events within a date range with complete details
 */
export const getCalendarEvents = async (startDate, endDate) => {
  console.log(
    `Starting to fetch calendar events from ${startDate.toISOString()} to ${endDate.toISOString()}`
  );

  try {
    // Ensure GAPI client is initialized and authenticated
    if (!(await ensureAuthenticatedGapiClient())) {
      console.log("GAPI client not authenticated, initiating sign-in process.");
      await signInWithGoogle();
      console.log("Sign-in process completed.");
    }

    const allEvents = [];
    for (const calendarId of CALENDAR_IDS) {
      console.log(`Fetching events for calendar ID: ${calendarId}`);
      const events = await fetchEvents(calendarId, startDate, endDate);
      allEvents.push(...events); // Combine events from all calendars
      console.log(
        `Fetched ${events.length} events from calendar ID: ${calendarId}`
      );
    }

    console.log(`Total events fetched: ${allEvents.length}`);
    return allEvents;
  } catch (error) {
    console.error("Error in getCalendarEvents:", error);
    throw error;
  }

  async function fetchEvents(calendarId, startDate, endDate) {
    try {
      if (!gapi?.client?.calendar) {
        throw new Error("Google Calendar API client not initialized");
      }

      const timeMin = startDate.toISOString();
      const timeMax = endDate.toISOString();

      console.log(
        `Fetching events from ${timeMin} to ${timeMax} for calendar ID: ${calendarId}`
      );

      const response = await gapi.client.calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin,
        timeMax: timeMax,
        showDeleted: false,
        singleEvents: true,
        maxResults: 100,
        orderBy: "startTime",
        fields:
          "items(id,summary,description,location,start,end,creator,organizer,attendees,conferenceData,recurrence,recurringEventId,visibility,status,htmlLink,colorId,attachments)",
      });

      const events = response.result.items || [];
      console.log(
        `Fetched ${events.length} events with full details from calendar ID: ${calendarId}`
      );
      return events;
    } catch (error) {
      console.error(
        `Error fetching events for calendar ID ${calendarId}:`,
        error
      );
      throw error;
    }
  }
};

/**
 * Get a single event by ID with full details
 */
export const getEventById = async (eventId) => {
  try {
    // First ensure GAPI client is initialized and authenticated
    if (!(await ensureAuthenticatedGapiClient())) {
      // If we couldn't authenticate with stored token, initiate sign-in
      await signInWithGoogle();

      // Wait for the token callback to complete
      return new Promise((resolve, reject) => {
        let waitTime = 0;
        const tokenCheckInterval = 100;
        const maxWaitTime = 10000;

        const checkToken = setInterval(() => {
          waitTime += tokenCheckInterval;

          if (accessToken) {
            clearInterval(checkToken);
            setupGapiWithToken().then(() => {
              fetchEvent().then(resolve).catch(reject);
            });
          } else if (waitTime >= maxWaitTime) {
            clearInterval(checkToken);
            console.error("Timed out waiting for access token");
            reject(new Error("Timed out waiting for access token"));
          }
        }, tokenCheckInterval);
      });
    }

    return fetchEvent();
  } catch (error) {
    console.error("Error in getEventById:", error);
    throw error;
  }

  async function fetchEvent() {
    try {
      if (!gapi?.client?.calendar) {
        throw new Error("Google Calendar API client not initialized");
      }

      const response = await gapi.client.calendar.events.get({
        calendarId: CALENDAR_ID,
        eventId: eventId,
      });

      return response.result;
    } catch (error) {
      console.error("Error fetching event details:", error);

      // Enhanced error logging
      if (error.result) {
        console.error("API error details:", error.result);
      }

      throw error;
    }
  }
};

/**
 * Add a new event to the calendar
 */
export const addCalendarEvent = async (eventDetails) => {
  try {
    // First ensure GAPI client is initialized and authenticated
    if (!(await ensureAuthenticatedGapiClient())) {
      // If we couldn't authenticate with stored token, initiate sign-in
      await signInWithGoogle();

      // Wait for the token callback to complete
      return new Promise((resolve, reject) => {
        let waitTime = 0;
        const tokenCheckInterval = 100;
        const maxWaitTime = 10000;

        const checkToken = setInterval(() => {
          waitTime += tokenCheckInterval;

          if (accessToken) {
            clearInterval(checkToken);
            setupGapiWithToken().then(() => {
              addEvent().then(resolve).catch(reject);
            });
          } else if (waitTime >= maxWaitTime) {
            clearInterval(checkToken);
            console.error("Timed out waiting for access token");
            reject(new Error("Timed out waiting for access token"));
          }
        }, tokenCheckInterval);
      });
    }

    return addEvent();
  } catch (error) {
    console.error("Error in addCalendarEvent:", error);
    throw error;
  }

  async function addEvent() {
    try {
      if (!gapi?.client?.calendar) {
        throw new Error("Google Calendar API client not initialized");
      }

      // Format event for API
      const event = {
        summary: eventDetails.summary,
        start: eventDetails.start,
        end: eventDetails.end || {
          dateTime: new Date(
            new Date(eventDetails.start.dateTime).getTime() + 60 * 60 * 1000
          ).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      if (eventDetails.location) event.location = eventDetails.location;
      if (eventDetails.description)
        event.description = eventDetails.description;

      console.log("Adding new event:", event);

      // Make API request to create event
      const response = await gapi.client.calendar.events.insert({
        calendarId: CALENDAR_ID,
        resource: event,
      });

      console.log("Event added successfully", response.result);
      return response.result;
    } catch (error) {
      console.error("Error adding calendar event:", error);

      // Enhanced error logging
      if (error.result) {
        console.error("API error details:", error.result);
      }

      throw error;
    }
  }
};

export const getPublicCalendarEvents = async (startDate, endDate) => {
    try {
      // Format dates for API request
      const timeMin = encodeURIComponent(startDate.toISOString());
      const timeMax = encodeURIComponent(endDate.toISOString());
  
      const allEvents = []; // Array to hold events from all calendars
  
      // Loop through each calendar ID
      for (const calendarId of CALENDAR_ID) {
        // Construct the public calendar URL using your API key
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`;
  
        // Make the fetch request
        const response = await fetch(url);
  
        if (!response.ok) {
          throw new Error(`Error fetching public calendar for ID ${calendarId}: ${response.status}`);
        }
  
        const data = await response.json();
        console.log(`Fetched public calendar events for ID ${calendarId}:`, data.items);
        allEvents.push(...(data.items || [])); // Combine events from all calendars
      }
  
      return allEvents;
    } catch (error) {
      console.error("Error fetching public calendar events:", error);
      return [];
    }
  };