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