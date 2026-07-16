import { chromium, type Browser } from "playwright";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

let sharedBrowser: Browser | null = null;
let launchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser) return sharedBrowser;
  if (!launchPromise) {
    launchPromise = chromium.launch({ headless: true });
  }
  sharedBrowser = await launchPromise;
  return sharedBrowser;
}

/**
 * Fetches a page's rendered HTML using a real browser engine. Some stores sit behind
 * WAFs (Akamai/Fastly bot managers) that fingerprint plain HTTP clients like Node's
 * fetch/undici and block them, but allow genuine browser traffic.
 */
export async function fetchHtmlViaBrowser(url: string): Promise<string> {
  const browser = await getBrowser();
  const context = await browser.newContext({ userAgent: USER_AGENT, locale: "pt-BR" });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    return await page.content();
  } finally {
    await context.close();
  }
}

export async function closeSharedBrowser(): Promise<void> {
  const browser = sharedBrowser;
  sharedBrowser = null;
  launchPromise = null;
  if (browser) {
    await browser.close();
  }
}
