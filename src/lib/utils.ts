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

export const extractDriveId = (url: string) => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  return match ? match[1] : null;
};

// Function to generate thumbnail URL based on fileId
export const getThumbnailUrl = (fileId: string | undefined) => {
  console.log("File ID:", fileId); // Debugging line
  const extractedFileId = fileId ? extractDriveId(fileId) : "";
  console.log("Extracted File ID:", extractedFileId); // Debugging line
  return fileId
    ? `https://lh3.googleusercontent.com/d/${extractedFileId}`
    : undefined;
};

// Function to extract URL from formula
export const extractUrlFromFormula = (formula: string): string => {
  const regex = /IMAGE\("([^"]+)"/;
  const match = formula.match(regex);
  return match ? match[1] : "";
};

export const extractLinkFromFormula = (formula: string): string => {
  const regex = /HYPERLINK\("([^"]+)"/;
  const match = formula.match(regex);
  return match ? match[1] : "";
};

export async function blobUrlToBase64(blobUrl: string) {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function formatDateOption(
  input: string,
  option: "MonthDay" | "DayOfWeek" | "MMDD"
): string {
  const [datePart, timePart, tzAbbr] = input.split(" ");
  const date = new Date(`${datePart}T${timePart}`);

  const formatters: Record<typeof option, string> = {
    MonthDay: `${formatMonthDay(date)} ${formatTime(date)}`,
    DayOfWeek: `${formatDayOfWeek(date)} ${formatTime(date)}`,
    MMDD: `${formatMMDD(date)} ${formatTime(date)}`,
  };

  return `${formatters[option]} ${tzAbbr}`;
}

// "May 8th"
function formatMonthDay(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate();
  return `${month} ${day}${getDaySuffix(day)}`;
}

// "Thursday"
function formatDayOfWeek(date: Date): string {
  return date.toLocaleString("en-US", { weekday: "long" });
}

// "5/8"
function formatMMDD(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// "1:54 PM"
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Adds st, nd, rd, or th
function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  const lastDigit = day % 10;
  return ["st", "nd", "rd"][lastDigit - 1] || "th";
}

export const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

export const emailData = {
  to: "kentjohnliloc@gmail.com,txl.tasty@gmail.com",
  subject: "⚠️ ALERT: Webhook Server Offline",
  text: "N8N or the server is currently offline. Please check the server status as soon as possible.",
  html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Server Alert</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #d9534f;
          color: white;
          padding: 10px 20px;
          border-radius: 5px 5px 0 0;
          margin: -20px -20px 20px -20px;
        }
        .content {
          padding: 10px 0;
        }
        .footer {
          font-size: 12px;
          color: #777;
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
        }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background-color: #5cb85c;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 15px;
        }
        .warning-icon {
          font-size: 24px;
          margin-right: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2><span class="warning-icon">⚠️</span> System Alert</h2>
        </div>
        <div class="content">
          <h3>Webhook Server Offline</h3>
          <p>We've detected that N8N or the server is currently <strong>offline</strong>.</p>
          <p>This may affect scheduled tasks and incoming webhooks. Please investigate this issue as soon as possible.</p>
          
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          
          <a href="https://shining-duckling-smiling.ngrok-free.app/" class="btn">Check Server Status</a>
        </div>
        <div class="footer">
          <p>This is an automated alert. Please do not reply to this email.</p>
          <p>If you need assistance, contact the IT team at kentjohnliloc@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `,
};
