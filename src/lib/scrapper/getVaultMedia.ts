import fs from "fs";
import path from "path";

// // Auto-scroll function to load more media
// async function autoScroll(page: puppeteer.Page) {
//   await page.evaluate(async () => {
//     await new Promise<void>((resolve) => {
//       let totalHeight = 0;
//       const distance = 300;
//       const timer = setInterval(() => {
//         window.scrollBy(0, distance);
//         totalHeight += distance;

//         if (totalHeight >= document.body.scrollHeight) {
//           clearInterval(timer);
//           resolve();
//         }
//       }, 200);
//     });
//   });
// }
import puppeteer from 'puppeteer-core';
import chrome from 'chrome-aws-lambda';

export async function getVaultMedia(username: string): Promise<string[]> {
  const cookiesPath = path.resolve(`./lib/access/${username}.json`);
  const cookies = JSON.parse(await fs.readFile(cookiesPath, 'utf-8'));

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: await chrome.executablePath,
    args: chrome.args,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();
  await page.setCookie(...cookies);

  await page.goto('https://onlyfans.com/my/vault', { waitUntil: 'networkidle0' });

  const mediaUrls = await page.evaluate(() => {
    const urls: string[] = [];
    document.querySelectorAll('img, video').forEach((el) => {
      const src = (el as HTMLImageElement | HTMLVideoElement).src;
      if (src) urls.push(src);
    });
    return urls;
  });

  await browser.close();
  return mediaUrls;
}
