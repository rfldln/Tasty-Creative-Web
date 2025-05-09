// lib/scraper/getVaultMedia.ts
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

export async function getVaultMedia(username: string): Promise<string[]> {
  const cookiesPath = path.resolve(`./lib/access/${username}.json`);
  const cookies = JSON.parse(await fs.readFile(cookiesPath, 'utf-8'));

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setCookie(...cookies);

  await page.goto('https://onlyfans.com/my/vault', {
    waitUntil: 'networkidle0',
  });

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
