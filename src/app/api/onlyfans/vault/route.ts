import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  try {
    const media = await getVaultMedia(username);
    return NextResponse.json({ media });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// fetchVault.ts
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

async function getVaultMedia(username: string): Promise<string[]> {
  const cookiesPath = path.resolve(`./cookies/${username}.json`);
  if (!fs.existsSync(cookiesPath))
    throw new Error(`No cookies for ${username}`);

  const cookies = JSON.parse(fs.readFileSync(cookiesPath, "utf8"));

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setCookie(...cookies);

  await page.goto("https://onlyfans.com/my/vault", {
    waitUntil: "networkidle0",
  });

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
