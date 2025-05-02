// This file contains the library functions for the app.
// It is a good practice to keep the library functions in a separate file

export const TIMEZONES = [
  { name: "PST" },
  { name: "MST" },
  { name: "CST" },
  { name: "EST" },
];
export const POSITIONS = ["LEFT", "RIGHT", "BOTTOM"];

export const DISPLAY_FIELDS: { label: string; key: string }[] = [
  { label: "Status", key: "Status" },
  { label: "Launch Date", key: "Launch Date" },
  { label: "Referrer Name", key: "Referrer Name" },
  { label: "Personality Type", key: "Personality Type" },
  { label: "Common Terms", key: "Common Terms" },
  { label: "Common Emojis", key: "Common Emojis" },
  { label: "Instagram", key: "Main Instagram @" },
  { label: "Twitter", key: "Main Twitter @" },
  { label: "TikTok", key: "Main TikTok @" },
  { label: "Chatting Managers", key: "Profile Link" },
];

export const prepFields = [
  "Share 3+ sexting scripts",
  "Set up & share Notion",
  "Fill out Client Info tab",
  "Confirm pricing with all teams",
  "Schedule social posts for launch",
  "Store passwords in client sheet",
  "Notify teams of launch date",
  "Complete Airtable profile",
];
