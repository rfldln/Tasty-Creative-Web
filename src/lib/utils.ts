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

 export const sanitizeCaption = (text: string) => {
    // 1. Remove emojis (your existing regex is good, but here's a more comprehensive one)
    const emojiRegex =
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F980}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{1FB00}-\u{1FBFF}]|[\u{E000}-\u{F8FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F191}-\u{1F251}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F171}]|[\u{1F17E}-\u{1F17F}]|[\u{1F18E}]|[\u{3030}]|[\u{2B50}]|[\u{2B55}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{3297}]|[\u{3299}]|[\u{303D}]|[\u{00A9}]|[\u{00AE}]|[\u{2122}]|[\u{23F0}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{24C2}]|[\u{23E9}-\u{23EF}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2600}-\u{2604}]|[\u{260E}]|[\u{2611}]|[\u{2614}-\u{2615}]|[\u{2618}]|[\u{261D}]|[\u{2620}]|[\u{2622}-\u{2623}]|[\u{2626}]|[\u{262A}]|[\u{262E}-\u{262F}]|[\u{2638}-\u{263A}]|[\u{2640}]|[\u{2642}]|[\u{231A}-\u{231B}]|[\u{2328}]|[\u{2388}]/gu;
    text = text.replace(emojiRegex, "");

    // 2. Strip various markdown and formatting styles
    // Remove bold/italic markdown
    text = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1");
    // Remove underline markdown
    text = text.replace(/_{1,2}([^_]+)_{1,2}/g, "$1");
    // Remove strikethrough
    text = text.replace(/~~([^~]+)~~/g, "$1");
    // Remove code blocks and inline code
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/`([^`]+)`/g, "$1");

    // 3. Normalize stylized Unicode letters/numbers (Mathematical Alphanumeric Symbols)
    const stylizedToAscii = (char: string): string => {
      const code = char.codePointAt(0);
      if (!code) return char;

      // Extended ranges for more comprehensive coverage
      const ranges = [
        // Mathematical Alphanumeric Symbols
        [0x1d400, 0x1d419, 0x41], // Bold A-Z
        [0x1d41a, 0x1d433, 0x61], // Bold a-z
        [0x1d434, 0x1d44d, 0x41], // Italic A-Z
        [0x1d44e, 0x1d467, 0x61], // Italic a-z
        [0x1d468, 0x1d481, 0x41], // Bold Italic A-Z
        [0x1d482, 0x1d49b, 0x61], // Bold Italic a-z
        [0x1d49c, 0x1d4b5, 0x41], // Script A-Z
        [0x1d4b6, 0x1d4cf, 0x61], // Script a-z
        [0x1d4d0, 0x1d4e9, 0x41], // Bold Script A-Z
        [0x1d4ea, 0x1d503, 0x61], // Bold Script a-z
        [0x1d504, 0x1d51d, 0x41], // Fraktur A-Z
        [0x1d51e, 0x1d537, 0x61], // Fraktur a-z
        [0x1d538, 0x1d551, 0x41], // Double-struck A-Z
        [0x1d552, 0x1d56b, 0x61], // Double-struck a-z
        [0x1d56c, 0x1d585, 0x41], // Bold Fraktur A-Z
        [0x1d586, 0x1d59f, 0x61], // Bold Fraktur a-z
        [0x1d5a0, 0x1d5b9, 0x41], // Sans-serif A-Z
        [0x1d5ba, 0x1d5d3, 0x61], // Sans-serif a-z
        [0x1d5d4, 0x1d5ed, 0x41], // Sans-serif Bold A-Z
        [0x1d5ee, 0x1d607, 0x61], // Sans-serif Bold a-z
        [0x1d608, 0x1d621, 0x41], // Sans-serif Italic A-Z
        [0x1d622, 0x1d63b, 0x61], // Sans-serif Italic a-z
        [0x1d63c, 0x1d655, 0x41], // Sans-serif Bold Italic A-Z
        [0x1d656, 0x1d66f, 0x61], // Sans-serif Bold Italic a-z
        [0x1d670, 0x1d689, 0x41], // Monospace A-Z
        [0x1d68a, 0x1d6a3, 0x61], // Monospace a-z

        // Mathematical digits
        [0x1d7ce, 0x1d7d7, 0x30], // Bold digits 0-9
        [0x1d7d8, 0x1d7e1, 0x30], // Double-struck digits 0-9
        [0x1d7e2, 0x1d7eb, 0x30], // Sans-serif digits 0-9
        [0x1d7ec, 0x1d7f5, 0x30], // Sans-serif Bold digits 0-9
        [0x1d7f6, 0x1d7ff, 0x30], // Monospace digits 0-9

        // Fullwidth characters (commonly used in stylized text)
        [0xff21, 0xff3a, 0x41], // Fullwidth A-Z
        [0xff41, 0xff5a, 0x61], // Fullwidth a-z
        [0xff10, 0xff19, 0x30], // Fullwidth 0-9
      ];

      for (const [from, to, base] of ranges) {
        if (code >= from && code <= to) {
          return String.fromCharCode(base + (code - from));
        }
      }

      return char;
    };

    // Apply stylized conversion to all characters
    text = [...text].map(stylizedToAscii).join("");

    // 4. Remove other common stylized elements
    // Remove hashtags
    text = text.replace(/#\w+/g, "");
    // Remove mentions
    text = text.replace(/@\w+/g, "");
    // Remove URLs
    text = text.replace(/https?:\/\/[^\s]+/g, "");

    // 5. Normalize punctuation and spacing
    // Replace various dash types with standard hyphen
    text = text.replace(/[–—]/g, "-");
    // Replace various quote types with standard quotes
    text = text.replace(/[""]/g, '"');
    text = text.replace(/['']/g, "'");
    // Replace ellipsis and normalize spacing
    text = text.replace(/[…]/g, "...");
    // Normalize multiple spaces to single space
    text = text.replace(/\s+/g, " ");

    return text.trim();
  };