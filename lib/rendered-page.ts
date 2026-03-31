import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

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

    if (browserlessResult) {
      return browserlessResult;
    }
  } catch {
    // Fall through to local browser fallback.
  }

  return fetchRenderedPageViaLocalBrowser(url);
}
