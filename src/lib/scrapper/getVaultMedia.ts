import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// Auto-scroll function to load more media
async function autoScroll(page: puppeteer.Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

export async function getVaultMedia(username: string): Promise<string[]> {
  // Corrected path to ./lib/access for your username JSON cookies
  const cookiesPath = path.resolve(`./lib/access/${username}.json`);
  if (!fs.existsSync(cookiesPath)) {
    throw new Error(`No cookies found for ${username}`);
  }

  const cookies = JSON.parse(fs.readFileSync(cookiesPath, "utf8"));

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setCookie(...cookies);

  const response = await page.goto("https://onlyfans.com/my/vault", {
    waitUntil: "networkidle0",
  });

  // Check if the session is expired (login page)
  if (!response || response.url().includes("/auth")) {
    await browser.close();
    throw new Error("Session expired or not authenticated. Please log in.");
  }

  // Auto-scroll to load more media
  await autoScroll(page);

  // Extract media URLs (img/video)
  const mediaUrls = await page.evaluate(() => {
    const urls: string[] = [];
    document.querySelectorAll("img, video").forEach((el) => {
      const src = (el as HTMLImageElement | HTMLVideoElement).src;
      if (src) urls.push(src);
    });
    return urls;
  });

  await browser.close();
  return mediaUrls;
}
