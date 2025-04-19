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
  { label: "Profile Link", key: "Profile Link" },
];

export const extractDriveId = (url: string) => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  return match ? match[1] : null;
};