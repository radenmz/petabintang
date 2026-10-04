/**
 * Puppeteer browser singleton.
 *
 * Kept alive across requests to avoid the 1–3s cold start per PDF. Launches a
 * system Chromium when PUPPETEER_EXECUTABLE_PATH is set (production) and falls
 * back to Puppeteer's managed browser otherwise (local dev). See docs/DEPLOY.md.
 */
import puppeteer, { type Browser } from 'puppeteer';
import { resolvePuppeteerExecutablePath } from '../lib/env';

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch {
      // ignore — already dead
    }
    browserInstance = null;
  }

  console.log('[Puppeteer] Launching new browser instance...');
  const executablePath = resolvePuppeteerExecutablePath();
  if (executablePath) {
    console.log(`[Puppeteer] Using system Chromium at ${executablePath}`);
  } else {
    console.log('[Puppeteer] Using Puppeteer-managed Chromium');
  }

  browserInstance = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage' // Important for Docker/containers
      // REMOVED: '--single-process' — causes crashes on heavy pages
    ]
  });

  browserInstance.on('disconnected', () => {
    console.warn('[Puppeteer] Browser disconnected unexpectedly. Will relaunch on next request.');
    browserInstance = null;
  });

  console.log('[Puppeteer] Browser instance ready.');
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (!browserInstance) return;
  console.log('[Puppeteer] Closing browser instance...');
  try {
    await browserInstance.close();
  } catch {
    // ignore
  }
  browserInstance = null;
  console.log('[Puppeteer] Browser closed.');
}

export function isBrowserLaunched(): boolean {
  return browserInstance !== null;
}

export function isBrowserConnected(): boolean {
  return browserInstance?.connected ?? false;
}
