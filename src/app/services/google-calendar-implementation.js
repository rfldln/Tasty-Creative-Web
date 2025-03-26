// services/google-calendar-implementation.js

// Your credentials from Google Cloud Console
const API_KEY = 'AIzaSyDjBT4KGbMGJnW5Yd-q9SyPnoDW8VQatG0'; // Replace with your API key
const CLIENT_ID = '960387706945-aqp91ft792nu9rpi5s6db6j5dh585itg.apps.googleusercontent.com'; // Replace with your Client ID

// Discovery docs and scopes
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar";

// References to Google API client
let gapi = null;
let tokenClient = null;
let accessToken = null;

/**
 * Initialize the Google API client with the new Identity Services library
 */
export const initGoogleCalendarAuth = async () => {
    try {
        console.log("Starting Google Calendar initialization");

        // Load the GAPI script if not already loaded
        if (!window.gapi) {
            console.log("Loading GAPI script");
            await loadGapiScript();
            console.log("GAPI script loaded successfully");
        }

        gapi = window.gapi;

        // Load the client library
        console.log("Loading client library");
        await new Promise((resolve, reject) => {
            gapi.load('client', {
                callback: resolve,
                onerror: (error) => {
                    console.error("Error loading client library", error);
                    reject(error);
                },
                timeout: 10000, // 10 seconds
                ontimeout: () => {
                    console.error("Timeout loading client library");
                    reject(new Error("Timeout loading client library"));
                }
            });
        });

        // Initialize the client with API key
        console.log("Initializing GAPI client with API key");
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
        });

        // Load the Identity Services script
        console.log("Loading Identity Services script");
        await loadGisScript();

        // Initialize the token client
        console.log("Initializing token client");
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                console.log("Token received");
                if (tokenResponse && tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                }
            },
        });

        console.log("Google Calendar initialized successfully");
        return { success: true };
    } catch (error) {
        console.error('Error initializing Google Calendar API:', error);
        console.error('Error details:', error?.details || error?.message || 'Unknown error');
        throw error;
    }
};

/**
 * Load the GAPI script dynamically
 */
const loadGapiScript = async () => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
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
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;

        script.onload = () => {
            console.log("GIS script loaded");
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
 * Check if the user is currently signed in
 */
export const isUserSignedIn = async () => {
    // With the new library, we can just check if we have an accessToken
    return !!accessToken;
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async () => {
    if (!tokenClient) {
        throw new Error('Google Auth not initialized');
    }

    try {
        console.log("Starting Google sign-in process");

        // Use a Promise to handle both success and failure cases
        return new Promise((resolve, reject) => {
            try {
                // Add an error event listener to detect popup blocks
                const popupBlockedHandler = (event) => {
                    if (event && event.message && event.message.includes('popup')) {
                        console.warn('Popup may have been blocked:', event);
                        reject({
                            type: 'POPUP_BLOCKED',
                            message: 'The sign-in popup was blocked by your browser. Please enable popups for this site.'
                        });
                    }
                };

                // Listen for errors that might indicate a popup block
                window.addEventListener('error', popupBlockedHandler);

                // Modify the token client to use redirect if needed
                tokenClient.callback = (response) => {
                    // Remove the error listener
                    window.removeEventListener('error', popupBlockedHandler);

                    if (response && response.access_token) {
                        accessToken = response.access_token;
                        resolve({ success: true });
                    } else if (response && response.error) {
                        reject(response);
                    } else {
                        resolve({ success: true }); // Still consider it success as the callback might be called later
                    }
                };

                // Request an access token with a timeout to catch issues
                setTimeout(() => {
                    // Remove the error listener after timeout
                    window.removeEventListener('error', popupBlockedHandler);
                }, 5000);

                // Try to open the popup with less restrictive settings
                tokenClient.requestAccessToken({
                    prompt: 'consent',
                    // Use a different flow that might work better with popup blockers
                    ux_mode: 'popup',
                    // Allow users to select accounts even if they're already signed in
                    select_account: true
                });

            } catch (innerError) {
                console.error('Error requesting token:', innerError);
                reject(innerError);
            }
        });
    } catch (error) {
        console.error('Google sign in error:', error);
        throw error;
    }
};

/**
 * Sign out from Google
 */
export const signOutFromGoogle = async () => {
    if (!google?.accounts?.oauth2) {
        throw new Error('Google Auth not initialized');
    }

    try {
        // Revoke the token
        if (accessToken) {
            google.accounts.oauth2.revoke(accessToken, () => {
                console.log('Token revoked');
            });
            accessToken = null;
        }

        return { success: true };
    } catch (error) {
        console.error('Google sign out error:', error);
        throw error;
    }
};

/**
 * Get calendar events within a date range with complete details
 */
export const getCalendarEvents = async (startDate, endDate) => {
    if (!gapi?.client?.calendar) {
        throw new Error('Google Calendar API not initialized');
    }

    // If no access token, we need to get one
    if (!accessToken) {
        await signInWithGoogle();

        // Wait for the token callback to complete with proper promise handling
        return new Promise((resolve, reject) => {
            let waitTime = 0;
            const tokenCheckInterval = 100; // Check every 100ms
            const maxWaitTime = 10000; // Wait max 10 seconds

            const checkToken = setInterval(() => {
                waitTime += tokenCheckInterval;

                if (accessToken) {
                    clearInterval(checkToken);
                    // Actually call and return fetchEvents when token is available
                    fetchEvents()
                        .then(resolve)
                        .catch(reject);
                } else if (waitTime >= maxWaitTime) {
                    clearInterval(checkToken);
                    console.error('Timed out waiting for access token');
                    resolve([]); // Resolve with empty array on timeout
                }
            }, tokenCheckInterval);
        });
    } else {
        return fetchEvents();
    }

    async function fetchEvents() {
        try {
            // Format dates for API request
            const timeMin = startDate.toISOString();
            const timeMax = endDate.toISOString();

            console.log(`Fetching events from ${timeMin} to ${timeMax}`);

            // Use your Tasty Calendar ID instead of 'primary'
            const calendarId = '2880d48fb939dfb37658d442fdc62ba6ecb31a4fc42c6d90340ccb0b1b7462ae@group.calendar.google.com';

            // Make API request to get events with all details
            const response = await gapi.client.calendar.events.list({
                'calendarId': calendarId,
                'timeMin': timeMin,
                'timeMax': timeMax,
                'showDeleted': false,
                'singleEvents': true,
                'maxResults': 100,
                'orderBy': 'startTime',
                // Request all available fields for comprehensive event details
                'fields': 'items(id,summary,description,location,start,end,creator,organizer,attendees,conferenceData,recurrence,recurringEventId,visibility,status,htmlLink,colorId,attachments)'
            });

            const events = response.result.items || [];
            console.log('Fetched events with full details:', events);
            return events;
        } catch (error) {
            console.error('Error fetching events:', error);
            throw error;
        }
    }
};

/**
 * Get a single event by ID with full details
 */
export const getEventById = async (eventId) => {
    if (!gapi?.client?.calendar) {
        throw new Error('Google Calendar API not initialized');
    }

    // If no access token, we need to get one
    if (!accessToken) {
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
                    fetchEvent()
                        .then(resolve)
                        .catch(reject);
                } else if (waitTime >= maxWaitTime) {
                    clearInterval(checkToken);
                    console.error('Timed out waiting for access token');
                    reject(new Error('Timed out waiting for access token'));
                }
            }, tokenCheckInterval);
        });
    } else {
        return fetchEvent();
    }

    async function fetchEvent() {
        try {
            // Use your Tasty Calendar ID instead of 'primary'
            const calendarId = '2880d48fb939dfb37658d442fdc62ba6ecb31a4fc42c6d90340ccb0b1b7462ae@group.calendar.google.com';

            const response = await gapi.client.calendar.events.get({
                'calendarId': calendarId,
                'eventId': eventId
            });

            return response.result;
        } catch (error) {
            console.error('Error fetching event details:', error);
            throw error;
        }
    }
};

/**
 * Add a new event to the calendar
 */
export const addCalendarEvent = async (eventDetails) => {
    if (!gapi?.client?.calendar) {
        throw new Error('Google Calendar API not initialized');
    }

    // If no access token, we need to get one
    if (!accessToken) {
        await signInWithGoogle();
        // Wait for the token callback to complete
        return new Promise((resolve) => {
            const checkToken = setInterval(() => {
                if (accessToken) {
                    clearInterval(checkToken);
                    addEvent();
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkToken);
                resolve(null);
            }, 10000);
        });
    } else {
        return addEvent();
    }

    async function addEvent() {
        try {
            // Format event for API
            const event = {
                'summary': eventDetails.summary,
                'start': eventDetails.start,
                'end': eventDetails.end || {
                    'dateTime': new Date(new Date(eventDetails.start.dateTime).getTime() + 60 * 60 * 1000).toISOString(),
                    'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };

            if (eventDetails.location) event.location = eventDetails.location;
            if (eventDetails.description) event.description = eventDetails.description;

            console.log("Adding new event:", event);

            // Use your Tasty Calendar ID instead of 'primary'
            const calendarId = '2880d48fb939dfb37658d442fdc62ba6ecb31a4fc42c6d90340ccb0b1b7462ae@group.calendar.google.com';

            // Make API request to create event
            const response = await gapi.client.calendar.events.insert({
                'calendarId': calendarId,
                'resource': event
            });

            console.log("Event added successfully", response.result);
            return response.result;
        } catch (error) {
            console.error('Error adding calendar event:', error);
            throw error;
        }
    }
};