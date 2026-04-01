import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { prisma } from "@/lib/db/prisma";
import { type EnrichmentDebugEntry, enrichWineWithCriticScores, enrichWineWithMetadataSources } from "@/lib/critic-sources";
import { fetchRenderedPage } from "@/lib/rendered-page";
import { readStoredWines, writeStoredWines } from "@/lib/wine-file-store";
import { getDefaultLocationId } from "@/lib/locations-store";
import { mapCellarStatusToDb, mapReadinessToDb, mapWineRecord } from "@/lib/wine-persistence";
import { type WineBottle } from "@/lib/wine-data";
import { inferReadinessFromVintage } from "@/lib/wine-readiness";

export type WineRecord = WineBottle;

export type WineInput = Omit<WineRecord, "id">;

type EnrichmentOptions = {
  deepCriticLookup?: boolean;
  debugEntries?: EnrichmentDebugEntry[];
};

export class ExternalScoringUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalScoringUnavailableError";
  }
}

const DEFAULT_APIFY_VIVINO_ACTOR = "mrbridge~vivino-ratings-scraper-with-vintages-from-url-list";

function pushDebug(
  entries: EnrichmentDebugEntry[] | undefined,
  stage: EnrichmentDebugEntry["stage"],
  source: string,
  status: EnrichmentDebugEntry["status"],
  detail: string
) {
  entries?.push({ stage, source, status, detail });
}

const execFileAsync = promisify(execFile);
function inferReadinessFromOptionalVintage(vintage: number | null) {
  return vintage ? inferReadinessFromVintage(vintage) : "Ready";
}

export async function listWines() {
  try {
    const records = await prisma.wineEntry.findMany({
      orderBy: [{ createdAt: "desc" }]
    });

    return records.map(mapWineRecord);
  } catch {
    return readStoredWines();
  }
}

export async function getWine(id: string) {
  try {
    const record = await prisma.wineEntry.findUnique({
      where: { id }
    });

    return record ? mapWineRecord(record) : null;
  } catch {
    const wines = (await readStoredWines()) as WineRecord[];
    return wines.find((wine) => wine.id === id) ?? null;
  }
}

export async function createWine(input: WineInput) {
  try {
    const record = await prisma.wineEntry.create({
      data: {
        wineName: input.wineName,
        producer: input.producer,
        imageUrl: input.imageUrl || null,
        vintage: input.vintage,
        region: input.region || null,
        country: input.country || null,
        grape: input.grape || null,
        style: input.style || null,
        bottleSize: input.bottleSize,
        quantity: input.quantity,
        purchasePrice: input.purchasePrice,
        estimatedValue: input.estimatedValue,
        vivinoLink: input.vivinoLink || null,
        vivinoScore: input.vivinoScore,
        robertParkerScore: input.robertParkerScore,
        jamesSucklingScore: input.jamesSucklingScore,
        criticSource: input.criticSource || null,
        locationId: input.locationId,
        shelf: input.shelf || null,
        slot: input.slot || null,
        readiness: mapReadinessToDb(input.readiness),
        drinkWindow: input.drinkWindow || null,
        acquiredOn: input.acquiredOn ? new Date(`${input.acquiredOn}T00:00:00.000Z`) : null,
        supplierId: input.supplierId || null,
        notes: input.notes || null,
        cellarStatus: mapCellarStatusToDb(input.cellarStatus),
        drankOn: input.drankOn ? new Date(`${input.drankOn}T00:00:00.000Z`) : null
      }
    });

    return mapWineRecord(record);
  } catch {
    const wines = (await readStoredWines()) as WineRecord[];
    const wine: WineRecord = {
      ...input,
      id: `wine-${Date.now()}`,
      cellarStatus: input.cellarStatus ?? "Cellar",
      drankOn: input.drankOn ?? ""
    };
    wines.unshift(wine);
    await writeStoredWines(wines);
    return wine;
  }
}

export async function updateWine(id: string, patch: Partial<WineInput>) {
  try {
    const existing = await prisma.wineEntry.findUnique({
      where: { id }
    });

    if (!existing) {
      return null;
    }

    const record = await prisma.wineEntry.update({
      where: { id },
      data: {
        ...(patch.wineName !== undefined ? { wineName: patch.wineName } : {}),
        ...(patch.producer !== undefined ? { producer: patch.producer } : {}),
        ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl || null } : {}),
        ...(patch.vintage !== undefined ? { vintage: patch.vintage } : {}),
        ...(patch.region !== undefined ? { region: patch.region || null } : {}),
        ...(patch.country !== undefined ? { country: patch.country || null } : {}),
        ...(patch.grape !== undefined ? { grape: patch.grape || null } : {}),
        ...(patch.style !== undefined ? { style: patch.style || null } : {}),
        ...(patch.bottleSize !== undefined ? { bottleSize: patch.bottleSize } : {}),
        ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
        ...(patch.purchasePrice !== undefined ? { purchasePrice: patch.purchasePrice } : {}),
        ...(patch.estimatedValue !== undefined ? { estimatedValue: patch.estimatedValue } : {}),
        ...(patch.vivinoLink !== undefined ? { vivinoLink: patch.vivinoLink || null } : {}),
        ...(patch.vivinoScore !== undefined ? { vivinoScore: patch.vivinoScore } : {}),
        ...(patch.robertParkerScore !== undefined ? { robertParkerScore: patch.robertParkerScore } : {}),
        ...(patch.jamesSucklingScore !== undefined ? { jamesSucklingScore: patch.jamesSucklingScore } : {}),
        ...(patch.criticSource !== undefined ? { criticSource: patch.criticSource || null } : {}),
        ...(patch.locationId !== undefined ? { locationId: patch.locationId } : {}),
        ...(patch.shelf !== undefined ? { shelf: patch.shelf || null } : {}),
        ...(patch.slot !== undefined ? { slot: patch.slot || null } : {}),
        ...(patch.readiness !== undefined ? { readiness: mapReadinessToDb(patch.readiness) } : {}),
        ...(patch.drinkWindow !== undefined ? { drinkWindow: patch.drinkWindow || null } : {}),
        ...(patch.acquiredOn !== undefined
          ? { acquiredOn: patch.acquiredOn ? new Date(`${patch.acquiredOn}T00:00:00.000Z`) : null }
          : {}),
        ...(patch.supplierId !== undefined ? { supplierId: patch.supplierId || null } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes || null } : {}),
        ...(patch.cellarStatus !== undefined ? { cellarStatus: mapCellarStatusToDb(patch.cellarStatus) } : {}),
        ...(patch.drankOn !== undefined
          ? { drankOn: patch.drankOn ? new Date(`${patch.drankOn}T00:00:00.000Z`) : null }
          : {})
      }
    });

    return mapWineRecord(record);
  } catch {
    const wines = await readStoredWines();
    const index = wines.findIndex((wine) => wine.id === id);

    if (index === -1) {
      return null;
    }

    wines[index] = {
      ...wines[index],
      ...patch,
      cellarStatus: patch.cellarStatus ?? wines[index].cellarStatus ?? "Cellar",
      drankOn: patch.drankOn ?? wines[index].drankOn ?? ""
    };

    await writeStoredWines(wines);
    return wines[index];
  }
}

export async function deleteWine(id: string) {
  try {
    const existing = await prisma.wineEntry.findUnique({
      where: { id }
    });

    if (!existing) {
      return false;
    }

    await prisma.wineEntry.delete({
      where: { id }
    });

    return true;
  } catch {
    const wines = await readStoredWines();
    const nextWines = wines.filter((wine) => wine.id !== id);

    if (nextWines.length === wines.length) {
      return false;
    }

    await writeStoredWines(nextWines);
    return true;
  }
}

function buildVivinoSearchQuery(input: Partial<WineInput>) {
  const sanitizedWineName = input.wineName?.trim();
  const sanitizedProducer = input.producer?.trim();
  const sanitizedRegion = input.region?.trim();
  const sanitizedCountry = input.country?.trim();
  const sanitizedGrape = input.grape?.trim();
  const baseParts = [
    sanitizedWineName,
    sanitizedProducer,
    sanitizedRegion && !/^unknown(?:\s+region)?$/i.test(sanitizedRegion) ? sanitizedRegion : "",
    sanitizedCountry && !/^unknown$/i.test(sanitizedCountry) ? sanitizedCountry : "",
    sanitizedGrape && !/^unknown(?:\s+blend)?$/i.test(sanitizedGrape) ? sanitizedGrape : ""
  ].filter(Boolean) as string[];

  const joined = baseParts.join(" ");
  const vintageText = input.vintage ? String(input.vintage) : "";

  return vintageText && !joined.includes(vintageText) ? `${joined} ${vintageText}`.trim() : joined;
}

export function buildVivinoSearchUrl(input: Partial<WineInput>) {
  const query = buildVivinoSearchQuery(input);
  return query ? `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}` : "";
}

function isDirectVivinoWineUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    return /(^|\/)w\/\d+(?:$|[/?#])/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function hasEnoughDetailsForDirectVivinoResolution(input: Partial<WineInput>) {
  const hasWineName = Boolean(input.wineName?.trim());
  const hasProducer = Boolean(input.producer?.trim());
  const hasDisambiguator = Boolean(
    input.vintage ||
      input.region?.trim() ||
      input.country?.trim() ||
      input.grape?.trim()
  );

  return hasWineName && hasProducer && hasDisambiguator;
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeApifyActorId(value: string) {
  return value.trim().replace(/\//g, "~");
}

function getVivinoUrlYear(url: string) {
  try {
    const parsed = new URL(url);
    const year = parsed.searchParams.get("year");
    return year && /^\d{4}$/.test(year) ? Number(year) : null;
  } catch {
    return null;
  }
}

function getBaseVivinoWineUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function extractApifyVivinoScore(payload: unknown, url: string) {
  if (!payload) {
    return null;
  }

  const items = Array.isArray(payload) ? payload : [payload];
  const targetYear = getVivinoUrlYear(url);
  let fallbackScore: number | null = null;

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    const vintage = typeof record.vintage === "number" ? record.vintage : typeof record.vintage === "string" ? Number(record.vintage) : null;

    for (const key of ["rating", "score", "averageRating", "ratings_average", "vivinoScore", "overallRating"]) {
      const value = record[key];

      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        if (targetYear && vintage === targetYear) {
          return value;
        }

        fallbackScore ??= value;
      }

      if (typeof value === "string") {
        const match = value.match(/\b([3-5]\.\d)\b/);

        if (match) {
          const parsed = Number(match[1]);

          if (targetYear && vintage === targetYear) {
            return parsed;
          }

          fallbackScore ??= parsed;
        }
      }
    }
  }

  return fallbackScore;
}

async function fetchVivinoScoreFromApify(url: string) {
  const token = process.env.APIFY_API_TOKEN?.trim();

  if (!token) {
    return null;
  }

  const actorId = normalizeApifyActorId(process.env.APIFY_VIVINO_ACTOR_ID?.trim() || DEFAULT_APIFY_VIVINO_ACTOR);
  const targetYear = getVivinoUrlYear(url);
  const baseWineUrl = getBaseVivinoWineUrl(url);
  const endpoint = new URL(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`);
  endpoint.searchParams.set("token", token);
  endpoint.searchParams.set("memory", "256");
  endpoint.searchParams.set("timeout", "120");
  const input = {
    wineUrls: [baseWineUrl],
    onlyValidRatings: false,
    delayBetweenRequests: 1000
  };

  const response = await fetch(endpoint.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(input),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Apify HTTP ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const score = extractApifyVivinoScore(payload, url);

  if (!score) {
    return null;
  }

  return score;
}

function scoreNameMatch(candidateName: string, query: string) {
  const candidate = normalizeSearchText(candidateName);
  const normalizedQuery = normalizeSearchText(query);

  if (!candidate || !normalizedQuery) {
    return 0;
  }

  let score = 0;

  for (const token of normalizedQuery.split(" ")) {
    if (candidate.includes(token)) {
      score += token.length;
    }
  }

  return score;
}

function parseVivinoSearchResult(html: string, query: string) {
  const decoded = decodeHtmlEntities(html);
  const regex = /"name":"([^"]+)","statistics":\{"status":"[^"]+","ratings_count":(\d+),"ratings_average":(\d+(?:\.\d+)?)[\s\S]*?"seo_name":"([^"]+)"/g;
  let best: { name: string; score: number; rating: number; seoName: string } | null = null;

  for (const match of decoded.matchAll(regex)) {
    const name = match[1];
    const rating = Number(match[3]);
    const seoName = match[4];
    const score = scoreNameMatch(name, query);

    if (Number.isNaN(rating) || rating <= 0) {
      continue;
    }

    if (!best || score > best.score) {
      best = { name, score, rating, seoName };
    }
  }

  return best;
}

function parseVivinoDirectLink(html: string, query: string) {
  const decoded = decodeHtmlEntities(html);
  const regex = /href="(\/[^"]*?\/w\/\d+(?:\?[^"]*)?)"/g;
  let best: { href: string; score: number } | null = null;

  for (const match of decoded.matchAll(regex)) {
    const href = match[1];
    const candidateText = href
      .replace(/^\/[a-z]{2}(?:\/[a-z]{2})?\//i, "")
      .replace(/\/w\/\d+(?:\?.*)?$/i, "")
      .replace(/[-_/]+/g, " ")
      .trim();
    const score = scoreNameMatch(candidateText, query);

    if (!best || score > best.score) {
      best = { href, score };
    }
  }

  return best && best.score > 0 ? `https://www.vivino.com${best.href}` : null;
}

function parseVivinoScoreNearQuery(html: string, query: string) {
  const decoded = decodeHtmlEntities(html);
  const queryPattern = query
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s\\S]{0,20}");

  if (!queryPattern) {
    return null;
  }

  const nearbyMatch = decoded.match(new RegExp(`${queryPattern}[\\s\\S]{0,1600}?ratings_average":(\\d+(?:\\.\\d+)?)`, "i"));

  if (!nearbyMatch) {
    return null;
  }

  const score = Number(nearbyMatch[1]);
  return Number.isNaN(score) ? null : score;
}

function parseVivinoScore(html: string) {
  const decoded = decodeHtmlEntities(html);
  const patterns = [
    /ratings_average":(\d+(?:\.\d+)?)/i,
    /average_rating":(\d+(?:\.\d+)?)/i,
    /"averageRating"\s*:\s*(\d+(?:\.\d+)?)/i,
    />\s*(\d\.\d)\s*<\/span>\s*<span[^>]*>\s*\d[\d,]*\s+ratings/i,
    /\b([3-5]\.\d)\s+count ratings\b/i,
    /\b([3-5]\.\d)\s+\d[\d,]*\s+ratings\b/i,
    /\b([3-5]\.\d)\s+ratings\b/i
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);

    if (!match) {
      continue;
    }

    const score = Number(match[1]);

    if (!Number.isNaN(score) && score > 0) {
      return score;
    }
  }

  return null;
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

function normalizeSearchSnippetText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-zA-Z0-9\s:/?&.=+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchVivinoSearchSnippetScore(input: WineInput) {
  const queries = Array.from(
    new Set(
      [
        [input.producer, input.wineName, input.vintage ? String(input.vintage) : "", "site:vivino.com"].filter(Boolean).join(" ").trim(),
        [normalizeSearchSnippetText(input.producer), normalizeSearchSnippetText(input.wineName), input.vintage ? String(input.vintage) : "", "site:vivino.com"]
          .filter(Boolean)
          .join(" ")
          .trim(),
        input.vivinoLink?.trim() ? `"${input.vivinoLink.trim()}"` : "",
        input.vivinoLink?.trim() ? `${normalizeSearchSnippetText(input.vivinoLink)} site:vivino.com` : ""
      ].filter(Boolean)
    )
  );

  for (const query of queries) {
    try {
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 CellarAtlas/1.0"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      const text = stripHtml(html);
      const score = parseVivinoScore(text);

      if (score) {
        return score;
      }
    } catch {
      // Try the next query variant.
    }
  }

  return null;
}

function parseDrinkingWindow(html: string) {
  const patterns = [
    /drinking window[^0-9]{0,40}(\d{4})\s*[-–]\s*(\d{4})/i,
    /drink(?:ing)?(?: now)?(?: from| between)?[^0-9]{0,40}(\d{4})\s*[-–]\s*(\d{4})/i,
    /from\s+(\d{4})\s+through\s+(\d{4})/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match) {
      return {
        start: Number(match[1]),
        end: Number(match[2])
      };
    }
  }

  return null;
}

function inferReadinessFromWindow(window: { start: number; end: number } | null): WineBottle["readiness"] | null {
  if (!window) {
    return null;
  }

  const year = new Date().getFullYear();

  if (year < window.start) {
    return "Hold";
  }

  const span = Math.max(1, window.end - window.start);
  const peakThreshold = window.end - Math.max(1, Math.floor(span / 3));

  if (year >= peakThreshold) {
    return "Peak";
  }

  return "Ready";
}

async function fetchText(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 CellarAtlas/1.0"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Vivino request failed with ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    if (process.platform !== "win32") {
      throw error;
    }

    const escapedUrl = url.replace(/'/g, "''");
    const command = `(Invoke-WebRequest -UseBasicParsing '${escapedUrl}' -Headers @{ 'User-Agent'='Mozilla/5.0 CellarAtlas/1.0' } -TimeoutSec 20).Content`;
    const candidates = [
      "pwsh",
      "powershell",
      "C:\\Users\\talmi\\AppData\\Local\\Microsoft\\WindowsApps\\pwsh.exe"
    ];
    let lastError: unknown = error;

    for (const executable of candidates) {
      try {
        const { stdout } = await execFileAsync(executable, ["-NoProfile", "-Command", command], {
          timeout: 30000,
          maxBuffer: 8 * 1024 * 1024
        });

        if (stdout.trim()) {
          return stdout;
        }
      } catch (shellError) {
        lastError = shellError;
      }
    }

    throw lastError;
  }
}

function buildCanonicalVivinoWineUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (!isDirectVivinoWineUrl(parsed.toString())) {
      return null;
    }

    const year = parsed.searchParams.get("year");
    parsed.search = "";

    if (year) {
      parsed.searchParams.set("year", year);
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

async function fetchVivinoBrowserData(url: string) {
  const data = await fetchRenderedPage(url);

  if (!data) {
    throw new ExternalScoringUnavailableError(
      "Vivino online enrichment requires a rendered-browser provider. Add BROWSERLESS_API_TOKEN in Vercel and redeploy."
    );
  }

  return data;
}

function extractVivinoScoreFromBrowserData(data: { html: string; title: string; scoreTexts: string[]; bodyText: string }) {
  const htmlScore = parseVivinoScore(data.html);

  if (htmlScore) {
    return htmlScore;
  }

  const titleMatch = data.title.match(/\b([3-5]\.\d)\b/);

  if (titleMatch) {
    const score = Number(titleMatch[1]);

    if (!Number.isNaN(score) && score > 0) {
      return score;
    }
  }

  for (const value of data.scoreTexts) {
    const score = Number(value);

    if (!Number.isNaN(score) && score >= 3 && score <= 5) {
      return score;
    }
  }

  const bodyMatch = data.bodyText.match(/\b([3-5]\.\d)\b/);

  if (!bodyMatch) {
    return null;
  }

  const score = Number(bodyMatch[1]);
  return Number.isNaN(score) ? null : score;
}

export async function enrichWineWithVivino(input: WineInput, debugEntries?: EnrichmentDebugEntry[]) {
  const manualVivinoLink = input.vivinoLink?.trim() ?? "";
  const searchQuery = buildVivinoSearchQuery(input);
  const searchUrl = buildVivinoSearchUrl(input);
  const shouldResolveDirectLink = !manualVivinoLink && hasEnoughDetailsForDirectVivinoResolution(input);
  const vivinoLink = manualVivinoLink || searchUrl;

  if (!vivinoLink) {
    pushDebug(debugEntries, "vivino", "Vivino", "skipped", "No direct link or searchable wine details were available.");
    return input;
  }

  const sourceUrl = isDirectVivinoWineUrl(vivinoLink) ? vivinoLink : searchUrl;

    if (!sourceUrl) {
    pushDebug(debugEntries, "vivino", "Vivino", "skipped", "No usable Vivino source URL was available.");
    return {
      ...input,
      vivinoLink
    };
  }

  if (isDirectVivinoWineUrl(sourceUrl)) {
    try {
      const apifyScore = await fetchVivinoScoreFromApify(sourceUrl);

      if (apifyScore) {
        pushDebug(debugEntries, "vivino", "Vivino Apify", "matched", `Parsed Apify score ${apifyScore}.`);
        return {
          ...input,
          vivinoLink: sourceUrl,
          vivinoScore: apifyScore
        };
      }

      pushDebug(debugEntries, "vivino", "Vivino Apify", "no_match", "Apify returned no usable Vivino score.");
    } catch (error) {
      pushDebug(
        debugEntries,
        "vivino",
        "Vivino Apify",
        "error",
        error instanceof Error ? error.message : "Apify Vivino request failed."
      );
    }
  } else {
    pushDebug(debugEntries, "vivino", "Vivino Apify", "skipped", "Apify requires a direct Vivino wine URL.");
  }

  try {
    const sourceHtml = await fetchText(sourceUrl);
    const searchResult = searchQuery ? parseVivinoSearchResult(sourceHtml, searchQuery) : null;
    const score =
      searchResult?.rating ??
      (searchQuery ? parseVivinoScoreNearQuery(sourceHtml, searchQuery) : null) ??
      parseVivinoScore(sourceHtml);
    const resolvedDirectLink =
      isDirectVivinoWineUrl(vivinoLink) || !shouldResolveDirectLink || !searchQuery
        ? null
        : parseVivinoDirectLink(sourceHtml, searchQuery);
    const resolvedVivinoLink = isDirectVivinoWineUrl(vivinoLink) ? vivinoLink : resolvedDirectLink ?? vivinoLink;
    const detailUrl = isDirectVivinoWineUrl(resolvedVivinoLink) ? resolvedVivinoLink : null;
    let drinkWindow = input.drinkWindow;
    let readiness = inferReadinessFromOptionalVintage(input.vintage);

    if (detailUrl) {
      try {
        const detailHtml = await fetchText(detailUrl);
        const window = parseDrinkingWindow(detailHtml);

        if (window) {
          drinkWindow = `${window.start}-${window.end}`;
          readiness = inferReadinessFromWindow(window) ?? readiness;
        }

        const detailScore = parseVivinoScore(detailHtml);

        if (detailScore) {
          pushDebug(debugEntries, "vivino", "Vivino fetch", "matched", `Parsed direct detail score ${detailScore}.`);
          return {
            ...input,
            vivinoLink: resolvedVivinoLink,
            vivinoScore: detailScore,
            drinkWindow,
            readiness
          };
        }
      } catch {
        // Keep any score we already found from the detail or search page even if a follow-up detail fetch fails.
      }
    }

    if (score) {
      pushDebug(debugEntries, "vivino", "Vivino fetch", "matched", `Parsed score ${score} from initial HTML.`);
      return {
        ...input,
        vivinoLink: resolvedVivinoLink,
        vivinoScore: score,
        drinkWindow,
        readiness
      };
    }
  } catch {
    pushDebug(debugEntries, "vivino", "Vivino fetch", "error", "Initial fetch failed or returned unreadable content.");
  }

  try {
    const browserData = await fetchVivinoBrowserData(sourceUrl);
    const browserScore = extractVivinoScoreFromBrowserData(browserData);
    const browserWindow = parseDrinkingWindow(browserData.html);
    const browserResolvedLink =
      isDirectVivinoWineUrl(vivinoLink) || !searchQuery
        ? browserData.finalUrl || vivinoLink
        : parseVivinoDirectLink(browserData.html, searchQuery) ?? browserData.finalUrl ?? vivinoLink;

    if (browserScore) {
      pushDebug(debugEntries, "vivino", "Vivino browser", "matched", `Parsed browser-rendered score ${browserScore}.`);
      return {
        ...input,
        vivinoLink: browserResolvedLink,
        vivinoScore: browserScore,
        drinkWindow: browserWindow ? `${browserWindow.start}-${browserWindow.end}` : input.drinkWindow,
        readiness: browserWindow
          ? inferReadinessFromWindow(browserWindow) ?? inferReadinessFromOptionalVintage(input.vintage)
          : inferReadinessFromOptionalVintage(input.vintage)
      };
    }

    const canonicalUrl = buildCanonicalVivinoWineUrl(browserResolvedLink);

    if (canonicalUrl && canonicalUrl !== browserResolvedLink) {
      const canonicalData = await fetchVivinoBrowserData(canonicalUrl);
      const canonicalScore = extractVivinoScoreFromBrowserData(canonicalData);
      const canonicalWindow = parseDrinkingWindow(canonicalData.html);

      if (canonicalScore) {
        pushDebug(debugEntries, "vivino", "Vivino canonical browser", "matched", `Parsed canonical score ${canonicalScore}.`);
        return {
          ...input,
          vivinoLink: canonicalData.finalUrl || canonicalUrl,
          vivinoScore: canonicalScore,
          drinkWindow: canonicalWindow ? `${canonicalWindow.start}-${canonicalWindow.end}` : input.drinkWindow,
          readiness:
            canonicalWindow
              ? inferReadinessFromWindow(canonicalWindow) ?? inferReadinessFromOptionalVintage(input.vintage)
              : inferReadinessFromOptionalVintage(input.vintage)
        };
      }
    }
  } catch {
    pushDebug(debugEntries, "vivino", "Vivino browser", "error", "Browser-rendered enrichment failed.");
  }

  const searchSnippetScore = await fetchVivinoSearchSnippetScore(input);

  if (searchSnippetScore) {
    pushDebug(debugEntries, "vivino", "Vivino search snippet", "matched", `Parsed snippet score ${searchSnippetScore}.`);
    return {
      ...input,
      vivinoLink,
      vivinoScore: searchSnippetScore
    };
  }

  pushDebug(debugEntries, "vivino", "Vivino", "no_match", "No Vivino score was found from fetch, browser, or search snippet fallbacks.");

  return {
    ...input,
    vivinoLink
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: () => T | Promise<T>) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => {
        void Promise.resolve(fallback()).then(resolve);
      }, timeoutMs);
    })
  ]);
}

function mergeEnrichmentResults(base: WineInput, criticResult: WineInput, vivinoResult: WineInput) {
  return {
    ...base,
    ...criticResult,
    vivinoLink: vivinoResult.vivinoLink || criticResult.vivinoLink || base.vivinoLink,
    vivinoScore: vivinoResult.vivinoScore || criticResult.vivinoScore || base.vivinoScore,
    drinkWindow: vivinoResult.drinkWindow || criticResult.drinkWindow || base.drinkWindow,
    readiness: vivinoResult.readiness || criticResult.readiness || base.readiness,
    robertParkerScore: criticResult.robertParkerScore || vivinoResult.robertParkerScore || base.robertParkerScore,
    jamesSucklingScore: criticResult.jamesSucklingScore || vivinoResult.jamesSucklingScore || base.jamesSucklingScore,
    criticSource: criticResult.criticSource || vivinoResult.criticSource || base.criticSource
  };
}

export async function enrichWineWithExternalScores(input: WineInput, options: EnrichmentOptions = {}) {
  const debugEntries = options.debugEntries;
  const withMetadata = await withTimeout(
    enrichWineWithMetadataSources(input, debugEntries),
    2500,
    () => input
  );
  const criticTimeoutMs = options.deepCriticLookup ? 12000 : 3500;
  const hasDirectVivinoLink = Boolean(withMetadata.vivinoLink?.trim() && isDirectVivinoWineUrl(withMetadata.vivinoLink));
  const vivinoTimeoutMs = options.deepCriticLookup
    ? hasDirectVivinoLink ? 45000 : 15000
    : hasDirectVivinoLink ? 12000 : 2500;
  const criticPromise = withTimeout(
    enrichWineWithCriticScores(withMetadata, { includeBrowserFallback: options.deepCriticLookup, debugEntries }),
    criticTimeoutMs,
    () => withMetadata
  );
  const vivinoPromise =
    withMetadata.vivinoLink?.trim() || buildVivinoSearchUrl(withMetadata)
      ? withTimeout(
          enrichWineWithVivino(withMetadata, debugEntries),
          vivinoTimeoutMs,
          () => withMetadata
        )
      : Promise.resolve(withMetadata);

  const [criticResult, vivinoResult] = await Promise.allSettled([criticPromise, vivinoPromise]);

  return mergeEnrichmentResults(
    withMetadata,
    criticResult.status === "fulfilled" ? criticResult.value : withMetadata,
    vivinoResult.status === "fulfilled" ? vivinoResult.value : withMetadata
  );
}

function extractVintage(text: string) {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function detectRegion(text: string) {
  const regions = [
    "Champagne",
    "Piedmont",
    "Rioja",
    "Bandol",
    "Chablis",
    "Tuscany",
    "Mendoza",
    "Douro",
    "Vouvray",
    "Napa Valley",
    "Burgundy",
    "Bordeaux"
  ];

  return regions.find((region) => text.toLowerCase().includes(region.toLowerCase())) ?? "Unknown Region";
}

function detectCountry(region: string) {
  const byRegion: Record<string, string> = {
    Champagne: "France",
    Piedmont: "Italy",
    Rioja: "Spain",
    Bandol: "France",
    Chablis: "France",
    Tuscany: "Italy",
    Mendoza: "Argentina",
    Douro: "Portugal",
    Vouvray: "France",
    "Napa Valley": "USA",
    Burgundy: "France",
    Bordeaux: "France"
  };

  return byRegion[region] ?? "Unknown";
}

function detectStyle(text: string) {
  const normalized = text.toLowerCase();

  if (/(champagne|sparkling|brut|blanc de blancs)/.test(normalized)) {
    return "Sparkling";
  }

  if (/(riesling|chenin|chablis|white|blanc)/.test(normalized)) {
    return "White";
  }

  if (/(port|fortified)/.test(normalized)) {
    return "Fortified";
  }

  if (/(moscato|dessert|sauternes)/.test(normalized)) {
    return "Dessert";
  }

  return "Red";
}

function detectGrape(text: string) {
  const grapes = [
    "Chardonnay",
    "Pinot Noir",
    "Cabernet Sauvignon",
    "Nebbiolo",
    "Sangiovese",
    "Tempranillo",
    "Chenin Blanc",
    "Gamay",
    "Malbec",
    "Mourvedre",
    "Moscato Bianco"
  ];

  return grapes.find((grape) => text.toLowerCase().includes(grape.toLowerCase())) ?? "Unknown Blend";
}

export async function generateWineDraftFromScan(rawText: string) {
  const cleaned = rawText.replace(/\s+/g, " ").trim();
  const vintage = extractVintage(cleaned);
  const style = detectStyle(cleaned);
  const locationId = await getDefaultLocationId();

  const draft: WineInput = {
    wineName: cleaned,
    producer: "",
    imageUrl: "",
    vintage,
    region: "",
    country: "",
    grape: "",
    style,
    bottleSize: "750ml",
    quantity: 1,
    purchasePrice: 0,
    estimatedValue: 0,
    vivinoLink: "",
    vivinoScore: 0,
    robertParkerScore: 0,
    jamesSucklingScore: 0,
    criticSource: "",
    locationId,
    shelf: "",
    slot: "",
    readiness: vintage ? inferReadinessFromVintage(vintage) : "Ready",
    drinkWindow: "",
    acquiredOn: new Date().toISOString().slice(0, 10),
    supplierId: "",
    notes: `Draft created from scanned label text: ${cleaned.slice(0, 160)}${cleaned.length > 160 ? "..." : ""}`,
    cellarStatus: "Cellar",
    drankOn: ""
  };

  return {
    ...draft,
    vivinoLink: buildVivinoSearchUrl(draft)
  };
}
