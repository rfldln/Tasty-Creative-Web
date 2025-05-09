// src/app/api/onlyfans/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto("https://onlyfans.com", { waitUntil: "networkidle2" });

    console.log(`👤 Waiting for login of ${username}...`);
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 0 });

    const cookies = await page.cookies();
    const dir = path.resolve("./cookies");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    fs.writeFileSync(
      path.join(dir, `${username}.json`),
      JSON.stringify(cookies, null, 2)
    );

    await browser.close();
    return NextResponse.json({ success: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
