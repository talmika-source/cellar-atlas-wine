import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
];

export type RenderedPageData = {
  finalUrl: string;
  title: string;
  html: string;
  bodyText: string;
  scoreTexts: string[];
};

function buildBrowserlessBaseUrl() {
  return (process.env.BROWSERLESS_BASE_URL?.trim() || "https://production-sfo.browserless.io").replace(/\/$/, "");
}

function buildBrowserlessQuery() {
  const params = new URLSearchParams();
  params.set("token", process.env.BROWSERLESS_API_TOKEN?.trim() || "");

  if (process.env.BROWSERLESS_USE_RESIDENTIAL_PROXY === "true") {
    params.set("proxy", "residential");

    const proxyCountry = process.env.BROWSERLESS_PROXY_COUNTRY?.trim();
    if (proxyCountry) {
      params.set("proxyCountry", proxyCountry);
    }
  }

  return params;
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]) : "";
}

function extractScoreTexts(text: string) {
  return Array.from(new Set(text.match(/\b(?:[3-5]\.\d|[8-9]\d|100)\b/g) ?? []));
}

async function fetchRenderedPageViaBrowserless(url: string) {
  const token = process.env.BROWSERLESS_API_TOKEN?.trim();

  if (!token) {
    return null;
  }

  const baseUrl = buildBrowserlessBaseUrl();
  const query = buildBrowserlessQuery();
  const endpoint = `${baseUrl}/content?${query.toString()}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 CellarAtlas/1.0"
    },
    body: JSON.stringify({
      url,
      bestAttempt: true
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const bodyText = stripHtml(html);

  return {
    finalUrl: url,
    title: parseTitle(html),
    html,
    bodyText,
    scoreTexts: extractScoreTexts(bodyText)
  } satisfies RenderedPageData;
}

function shouldTryBrowserlessUnblock(page: RenderedPageData | null) {
  if (!page) {
    return true;
  }

  if (!page.html.trim() || !page.bodyText.trim()) {
    return true;
  }

  return /(access denied|request blocked|forbidden|captcha|verify you are human|bot detection)/i.test(
    `${page.title} ${page.bodyText}`.trim()
  );
}

async function fetchRenderedPageViaBrowserlessUnblock(url: string) {
  const token = process.env.BROWSERLESS_API_TOKEN?.trim();

  if (!token) {
    return null;
  }

  const baseUrl = buildBrowserlessBaseUrl();
  const query = buildBrowserlessQuery();
  const endpoint = `${baseUrl}/unblock?${query.toString()}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 CellarAtlas/1.0"
    },
    body: JSON.stringify({
      url,
      content: true,
      cookies: false,
      screenshot: false,
      browserWSEndpoint: false
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { content?: string | null };
  const html = payload.content?.trim();

  if (!html) {
    return null;
  }

  const bodyText = stripHtml(html);

  return {
    finalUrl: url,
    title: parseTitle(html),
    html,
    bodyText,
    scoreTexts: extractScoreTexts(bodyText)
  } satisfies RenderedPageData;
}

async function fetchRenderedPageViaBrowserlessWebSocket(url: string) {
  const token = process.env.BROWSERLESS_API_TOKEN?.trim();

  if (!token) {
    return null;
  }

  const baseUrl = buildBrowserlessBaseUrl();
  const query = buildBrowserlessQuery();
  const endpoint = `${baseUrl}/unblock?${query.toString()}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 CellarAtlas/1.0"
    },
    body: JSON.stringify({
      url,
      browserWSEndpoint: true,
      cookies: true,
      ttl: 30000
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    browserWSEndpoint?: string | null;
    cookies?: Array<{
      name: string;
      value: string;
      domain?: string;
      path?: string;
      expires?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "Strict" | "Lax" | "None";
    }>;
  };

  if (!payload.browserWSEndpoint) {
    return null;
  }

  let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | null = null;

  try {
    browser = await chromium.connectOverCDP(`${payload.browserWSEndpoint}?token=${encodeURIComponent(token)}`);
    const context = browser.contexts()[0] ?? (await browser.newContext());

    if (payload.cookies?.length) {
      await context.addCookies(
        payload.cookies.map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain ?? new URL(url).hostname,
          path: cookie.path ?? "/",
          expires: cookie.expires ?? -1,
          httpOnly: cookie.httpOnly ?? false,
          secure: cookie.secure ?? true,
          sameSite: cookie.sameSite ?? "Lax"
        }))
      );
    }

    const page = await context.newPage();
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });
    await page.waitForTimeout(3000);

    const html = await page.content();
    const bodyText = (await page.locator("body").innerText().catch(() => "")) || "";
    const title = await page.title().catch(() => parseTitle(html));

    return {
      finalUrl: page.url(),
      title,
      html,
      bodyText,
      scoreTexts: extractScoreTexts(bodyText)
    } satisfies RenderedPageData;
  } catch {
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}

async function fetchRenderedPageViaLocalBrowser(url: string) {
  const browserPath = browserCandidates.find((candidate) => existsSync(candidate));

  if (!browserPath) {
    return null;
  }

  const scriptPath = path.join(process.cwd(), "scripts", "fetch-browser-page.cjs");

  try {
    const { stdout } = await execFileAsync(process.execPath, [scriptPath, url, browserPath], {
      timeout: 90000,
      maxBuffer: 16 * 1024 * 1024
    });
    const payload = JSON.parse(stdout) as {
      finalUrl: string;
      title: string;
      html: string;
      bodyText: string;
    };

    return {
      ...payload,
      scoreTexts: extractScoreTexts(payload.bodyText)
    } satisfies RenderedPageData;
  } catch {
    return null;
  }
}

export async function fetchRenderedPage(url: string) {
  try {
    const browserlessResult = await fetchRenderedPageViaBrowserless(url);

    if (browserlessResult && !shouldTryBrowserlessUnblock(browserlessResult)) {
      return browserlessResult;
    }

    const unblockResult = await fetchRenderedPageViaBrowserlessUnblock(url);

    if (unblockResult) {
      return unblockResult;
    }

    const wsResult = await fetchRenderedPageViaBrowserlessWebSocket(url);

    if (wsResult) {
      return wsResult;
    }

    if (browserlessResult) {
      return browserlessResult;
    }
  } catch {
    // Fall through to local browser fallback.
  }

  return fetchRenderedPageViaLocalBrowser(url);
}
