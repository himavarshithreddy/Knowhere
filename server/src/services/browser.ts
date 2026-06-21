import { chromium, Browser } from 'playwright';
import PQueue from 'p-queue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let browserInstance: Browser | null = null;
let requestCount = 0;

export const browserMetrics = {
  activeContexts: 0,
  activePages: 0,
  browserAlive: false,
  requestsHandled: 0,
  restarts: 0
};

// Limit concurrent Playwright jobs to 3
const queue = new PQueue({ concurrency: 3 });

async function launchBrowser() {
  const b = await chromium.launch({
    headless: true,
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-extensions',
      '--disable-default-apps',
      '--mute-audio',
      '--hide-scrollbars'
    ]
  });
  
  b.on('disconnected', () => {
    browserMetrics.browserAlive = false;
    browserInstance = null;
    console.warn('[Playwright] Browser disconnected. Will auto-restart on next request.');
  });
  
  browserMetrics.browserAlive = true;
  browserMetrics.restarts++;
  requestCount = 0;
  return b;
}

async function getBrowser(): Promise<Browser> {
  // Periodically restart Chromium to prevent memory leaks
  if (requestCount >= 500) {
    console.log('[Playwright] Request limit reached (500). Restarting browser to free memory.');
    if (browserInstance) {
      await browserInstance.close().catch(() => {});
      browserInstance = null;
    }
  }

  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await launchBrowser();
  }
  return browserInstance;
}

function timeoutPromise(ms: number) {
  return new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout of ${ms}ms exceeded`)), ms));
}

export async function fetchWithBrowser(url: string, timeoutMs = 15000): Promise<string> {
  return queue.add(async () => {
    requestCount++;
    browserMetrics.requestsHandled++;
    
    // Hard wrap the entire execution
    return Promise.race([
      _executeFetch(url, timeoutMs),
      timeoutPromise(timeoutMs + 3000) // Extra buffer for cleanup/timeouts internally
    ]);
  }) as Promise<string>;
}

async function _executeFetch(url: string, timeoutMs: number): Promise<string> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
    locale: "en-US",
    timezoneId: "Asia/Kolkata"
  });
  browserMetrics.activeContexts++;

  // Block unnecessary resources
  await context.route('**/*', (route) => {
    const type = route.request().resourceType();
    const reqUrl = route.request().url();
    
    if (['image', 'media', 'font'].includes(type)) {
      return route.abort();
    }
    
    // Block common analytics/trackers
    if (reqUrl.includes('google-analytics') || reqUrl.includes('doubleclick') || reqUrl.includes('tracker')) {
      return route.abort();
    }
    
    route.continue();
  });

  const page = await context.newPage();
  browserMetrics.activePages++;

  // Hard timeouts everywhere
  page.setDefaultTimeout(timeoutMs);
  page.setDefaultNavigationTimeout(timeoutMs);

  page.on('crash', () => {
    console.error(`[Playwright] Page crashed while processing ${url}`);
  });

  try {
    // Handle infinite loading pages by waiting for domcontentloaded instead of networkidle
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    
    // Explicit wait for JS to populate DOM
    await page.waitForTimeout(2500);
    
    return await page.content();
  } catch (error) {
    // Capture screenshots on failures
    const jobId = Date.now().toString() + '-' + Math.round(Math.random() * 1000);
    const screenshotPath = path.resolve(__dirname, `../../../data/failures/${jobId}.png`);
    
    try {
      await page.screenshot({ path: screenshotPath });
      console.error(`[Playwright] Captured failure screenshot for ${url} -> ${screenshotPath}`);
    } catch (screenshotError) {
      console.error(`[Playwright] Failed to take failure screenshot:`, screenshotError);
    }
    
    console.error(`[Playwright] Failed to get content for ${url}:`, error);
    throw error;
  } finally {
    // Watch for zombie pages: explicit cleanup
    await page.close().catch(() => {});
    browserMetrics.activePages--;
    await context.close().catch(() => {});
    browserMetrics.activeContexts--;
  }
}

// Graceful shutdown
function handleShutdown() {
  if (browserInstance) {
    browserInstance.close().finally(() => process.exit(0));
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
