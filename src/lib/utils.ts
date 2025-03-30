import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getEmbedUrl = (fileUrl: string) => {
  const driveMatch = fileUrl.match(/\/file\/d\/(.*?)(\/|$|\?)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`; // Google Drive preview
  }
  return fileUrl; // Direct file links remain unchanged
};

export function convertToPreviewLink(link: string): string | undefined {
  if (!link) return undefined;

  return link.replace("view", "preview");
}
