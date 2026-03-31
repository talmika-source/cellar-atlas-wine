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

  const baseUrl = (process.env.BROWSERLESS_BASE_URL?.trim() || "https://production-sfo.browserless.io").replace(/\/$/, "");
  const endpoint = `${baseUrl}/content?token=${encodeURIComponent(token)}`;

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

    if (browserlessResult) {
      return browserlessResult;
    }
  } catch {
    // Fall through to local browser fallback.
  }

  return fetchRenderedPageViaLocalBrowser(url);
}
