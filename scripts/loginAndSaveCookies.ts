// scripts/loginAndSaveCookies.ts
import puppeteer from 'puppeteer';
import fs from 'fs/promises';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://onlyfans.com');

  // Wait for you to manually login (e.g., 2FA if needed)
  console.log('Please login manually...');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 0 });

  const cookies = await page.cookies();
  await fs.writeFile('./lib/access/autumren.json', JSON.stringify(cookies, null, 2));

  console.log('Cookies saved!');
  await browser.close();
})();
