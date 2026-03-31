import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { type WineInput } from "@/lib/wine-store";

export type CriticScores = {
  robertParkerScore?: number | null;
  jamesSucklingScore?: number | null;
  criticSource?: string;
};

type CriticEnrichmentOptions = {
  includeBrowserFallback?: boolean;
};

type CandidateSource = {
  name: string;
  endpoint: string | undefined;
  apiKey: string | undefined;
};

type CriticLookupQuery = {
  wineName: string;
  producer: string;
  vintage: string;
  region?: string;
  country?: string;
};

const candidateSources: CandidateSource[] = [
  {
    name: "Wine-Searcher",
    endpoint: process.env.WINE_SEARCHER_API_URL,
    apiKey: process.env.WINE_SEARCHER_API_KEY
  },
  {
    name: "Global Wine Score",
    endpoint: process.env.GLOBAL_WINE_SCORE_API_URL,
    apiKey: process.env.GLOBAL_WINE_SCORE_API_KEY
  }
];

const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
];

const execFileAsync = promisify(execFile);

function normalizeQueryValue(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ").replace(/[\s,;:/-]+$/g, "") ?? "";
}

function stripVintageFromName(value: string, vintage: string) {
  if (!value || !vintage) {
    return value;
  }

  return value.replace(new RegExp(`(?:^|\\s)${vintage}(?:\\s|$)`, "g"), " ").replace(/\s+/g, " ").trim();
}

function buildAliasVariants(value: string) {
  const variants = new Set<string>();
  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  variants.add(trimmed);

  const replacements: Array<[RegExp, string]> = [
    [/\bsuperiore\b/gi, "Superior"],
    [/\bsuperior\b/gi, "Superiore"],
    [/\briserva\b/gi, "Riserva"],
    [/\bclassico\b/gi, "Classico"]
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(trimmed)) {
      variants.add(trimmed.replace(pattern, replacement).replace(/\s+/g, " ").trim());
    }
  }

  return Array.from(variants);
}

function normalizeLookupText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeLookupText(value: string) {
  return normalizeLookupText(value)
    .toLowerCase()
    .split(" ")
    .filter(Boolean);
}

function buildWineSearcherUrl(query: CriticLookupQuery) {
  const parts = [query.producer, query.wineName, query.region, query.country, query.vintage].filter(Boolean).join(" ").trim();
  if (!parts) {
    return null;
  }

  const slug = normalizeLookupText(parts)
    .toLowerCase()
    .replace(/\s+/g, "+");

  return `https://www.wine-searcher.com/find/${slug}#t3`;
}

function pushVariant(target: CriticLookupQuery[], variant: CriticLookupQuery) {
  if (!variant.wineName && !variant.producer) {
    return;
  }

  target.push(variant);
}

function parseCriticScoreFromText(text: string, criticPattern: RegExp) {
  const patterns = [
    new RegExp(`${criticPattern.source}[\\s\\S]{0,80}?(\\d{2,3})\\s*\\/\\s*100`, criticPattern.flags),
    new RegExp(`(\\d{2,3})\\s*\\/\\s*100[\\s\\S]{0,80}?${criticPattern.source}`, criticPattern.flags),
    new RegExp(`${criticPattern.source}[\\s\\S]{0,80}?score[^0-9]{0,20}(\\d{2,3})`, criticPattern.flags),
    new RegExp(`(\\d{2,3})[^0-9]{0,10}(?:pts|points)[\\s\\S]{0,80}?${criticPattern.source}`, criticPattern.flags),
    new RegExp(`${criticPattern.source}[^0-9]{0,12}(\\d{2,3})(?!\\d)`, criticPattern.flags),
    new RegExp(`(\\d{2,3})(?!\\d)[^a-zA-Z0-9]{0,12}${criticPattern.source}`, criticPattern.flags)
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    const score = Number(match[1]);

    if (!Number.isNaN(score) && score >= 80 && score <= 100) {
      return score;
    }
  }

  return null;
}

function buildLookupQueries(wine: WineInput) {
  const rawWineName = normalizeQueryValue(wine.wineName);
  const producer = normalizeQueryValue(wine.producer);
  const vintage = wine.vintage ? String(wine.vintage) : "";
  const wineName = stripVintageFromName(rawWineName, vintage) || rawWineName;
  const region = normalizeQueryValue(wine.region);
  const country = normalizeQueryValue(wine.country);
  const wineNameVariants = buildAliasVariants(wineName);
  const producerVariants = buildAliasVariants(producer);
  const variants: CriticLookupQuery[] = [];

  for (const currentWineName of wineNameVariants) {
    for (const currentProducer of producerVariants) {
      const combinedName = [currentProducer, currentWineName].filter(Boolean).join(" ").trim();
      const normalizedWineName = normalizeLookupText(currentWineName);
      const normalizedProducer = normalizeLookupText(currentProducer);
      const normalizedCombinedName = normalizeLookupText(combinedName);
      const reorderedCombinedName = [...tokenizeLookupText(currentWineName), ...tokenizeLookupText(currentProducer)].join(" ").trim();

      pushVariant(variants, {
        wineName: currentWineName,
        producer: currentProducer,
        vintage,
        region: region || undefined,
        country: country || undefined
      });

      if (combinedName && combinedName !== currentWineName) {
        pushVariant(variants, {
          wineName: combinedName,
          producer: currentProducer,
          vintage,
          region: region || undefined,
          country: country || undefined
        });
      }

      if (combinedName && combinedName !== currentProducer) {
        pushVariant(variants, {
          wineName: currentWineName,
          producer: combinedName,
          vintage,
          region: region || undefined,
          country: country || undefined
        });
      }

      if (combinedName) {
        pushVariant(variants, {
          wineName: combinedName,
          producer: "",
          vintage,
          region: region || undefined,
          country: country || undefined
        });
      }

      if (normalizedWineName && normalizedWineName !== currentWineName) {
        pushVariant(variants, {
          wineName: normalizedWineName,
          producer: currentProducer,
          vintage,
          region: region || undefined,
          country: country || undefined
        });
      }

      if (normalizedProducer && normalizedProducer !== currentProducer) {
        pushVariant(variants, {
          wineName: currentWineName,
          producer: normalizedProducer,
          vintage,
          region: region || undefined,
          country: country || undefined
        });
      }

      if (normalizedCombinedName && normalizedCombinedName !== combinedName) {
        pushVariant(variants, {
          wineName: normalizedCombinedName,
          producer: "",
          vintage,
          region: region || undefined,
          country: country || undefined
        });
      }

      if (reorderedCombinedName && reorderedCombinedName !== normalizedCombinedName) {
        pushVariant(variants, {
          wineName: reorderedCombinedName,
          producer: "",
          vintage,
          region: region || undefined,
          country: country || undefined
        });
      }
    }
  }

  return variants.filter(
    (variant, index, allVariants) =>
      Boolean(variant.wineName || variant.producer) &&
      allVariants.findIndex(
        (candidate) =>
          normalizeLookupText(candidate.wineName) === normalizeLookupText(variant.wineName) &&
          normalizeLookupText(candidate.producer) === normalizeLookupText(variant.producer) &&
          candidate.vintage === variant.vintage &&
          candidate.region === variant.region &&
          candidate.country === variant.country
      ) === index
  );
}

function extractNumericScore(value: unknown) {
  if (typeof value === "number" && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.match(/\b([8-9]\d|100)(?:\.\d+)?\b/);

    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function walkCriticPayload(value: unknown, trail = ""): CriticScores {
  if (Array.isArray(value)) {
    return value.reduce<CriticScores>((scores, item, index) => {
      const next = walkCriticPayload(item, `${trail}[${index}]`);
      return {
        robertParkerScore: scores.robertParkerScore ?? next.robertParkerScore,
        jamesSucklingScore: scores.jamesSucklingScore ?? next.jamesSucklingScore
      };
    }, {});
  }

  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>);
  let robertParkerScore: number | null = null;
  let jamesSucklingScore: number | null = null;

  for (const [key, nestedValue] of entries) {
    const keyTrail = `${trail}.${key}`.toLowerCase();
    const numeric = extractNumericScore(nestedValue);

    if (!robertParkerScore && numeric && /(robert.?parker|wine.?advocate|parker)/i.test(keyTrail)) {
      robertParkerScore = numeric;
    }

    if (!jamesSucklingScore && numeric && /james.?suckling|suckling/i.test(keyTrail)) {
      jamesSucklingScore = numeric;
    }

    const nestedScores = walkCriticPayload(nestedValue, keyTrail);
    robertParkerScore ??= nestedScores.robertParkerScore ?? null;
    jamesSucklingScore ??= nestedScores.jamesSucklingScore ?? null;
  }

  return {
    robertParkerScore,
    jamesSucklingScore
  };
}

async function fetchCriticSource(source: CandidateSource, query: CriticLookupQuery) {
  if (!source.endpoint || !source.apiKey) {
    return null;
  }

  const url = new URL(source.endpoint);
  url.searchParams.set("wineName", query.wineName);
  url.searchParams.set("producer", query.producer);
  url.searchParams.set("vintage", query.vintage);

  if (query.region) {
    url.searchParams.set("region", query.region);
  }

  if (query.country) {
    url.searchParams.set("country", query.country);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${source.apiKey}`,
      "X-API-Key": source.apiKey,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as unknown;
  const scores = walkCriticPayload(payload);

  if (!scores.robertParkerScore && !scores.jamesSucklingScore) {
    return null;
  }

  return {
    ...scores,
    criticSource: source.name
  };
}

async function fetchBrowserPage(url: string) {
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

    return JSON.parse(stdout) as {
      finalUrl: string;
      title: string;
      html: string;
      bodyText: string;
    };
  } catch {
    return null;
  }
}

async function fetchWineSearcherBrowserScores(query: CriticLookupQuery) {
  const url = buildWineSearcherUrl(query);

  if (!url) {
    return null;
  }

  const page = await fetchBrowserPage(url);

  if (!page) {
    return null;
  }

  const combinedText = `${page.title}\n${page.bodyText}\n${page.html}`;
  const robertParkerScore = parseCriticScoreFromText(combinedText, /(robert.?parker|wine advocate|parker|wa|rp)/i);
  const jamesSucklingScore = parseCriticScoreFromText(combinedText, /(james.?suckling|suckling|js)/i);

  if (!robertParkerScore && !jamesSucklingScore) {
    return null;
  }

  return {
    robertParkerScore,
    jamesSucklingScore,
    criticSource: "Wine-Searcher browser"
  };
}

async function fetchSearchResultsHtml(query: string) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 CellarAtlas/1.0"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

function decodeSearchResultUrl(url: string) {
  try {
    const parsed = new URL(url, "https://duckduckgo.com");
    const redirect = parsed.searchParams.get("uddg");
    return redirect ? decodeURIComponent(redirect) : parsed.toString();
  } catch {
    return url;
  }
}

function extractSearchResultLinks(html: string) {
  const links = new Set<string>();
  const patterns = [
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"/gi,
    /<a[^>]+href="([^"]+)"[^>]*>\s*[^<]*<\/a>/gi
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const href = match[1];

      if (!href || href.startsWith("/") || href.startsWith("javascript:")) {
        continue;
      }

      const decoded = decodeSearchResultUrl(href);

      if (/duckduckgo\.com/i.test(decoded)) {
        continue;
      }

      links.add(decoded);

      if (links.size >= 5) {
        return Array.from(links);
      }
    }
  }

  return Array.from(links);
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractSearchResultSnippets(html: string) {
  const snippets = new Set<string>();
  const patterns = [
    /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi,
    /<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/gi,
    /<span[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/span>/gi
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const snippet = stripHtml(match[1]);

      if (snippet) {
        snippets.add(snippet);
      }
    }
  }

  return Array.from(snippets);
}

function extractCriticScoresFromSearchHtml(html: string) {
  const searchText = stripHtml(html);
  const snippets = extractSearchResultSnippets(html);
  const bodies = [searchText, ...snippets];
  let robertParkerScore: number | null = null;
  let jamesSucklingScore: number | null = null;

  for (const body of bodies) {
    robertParkerScore ||= parseCriticScoreFromText(body, /(robert.?parker|wine advocate|parker|wa|rp)/i);
    jamesSucklingScore ||= parseCriticScoreFromText(body, /(james.?suckling|suckling|js)/i);

    if (robertParkerScore && jamesSucklingScore) {
      break;
    }
  }

  if (!robertParkerScore && !jamesSucklingScore) {
    return null;
  }

  return {
    robertParkerScore,
    jamesSucklingScore,
    criticSource: "Search snippet"
  };
}

async function fetchPublicCriticScores(query: CriticLookupQuery) {
  const combinedQuery = [query.producer, query.wineName, query.vintage, query.region, query.country]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!combinedQuery) {
    return null;
  }

  const searchHtml = await fetchSearchResultsHtml(`${combinedQuery} James Suckling Robert Parker`);

  if (!searchHtml) {
    return null;
  }

  const snippetScores = extractCriticScoresFromSearchHtml(searchHtml);

  if (snippetScores) {
    return snippetScores;
  }

  const links = extractSearchResultLinks(searchHtml);

  for (const link of links) {
    try {
      const response = await fetch(link, {
        headers: {
          "User-Agent": "Mozilla/5.0 CellarAtlas/1.0"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        continue;
      }

      const text = await response.text();
      const robertParkerScore = parseCriticScoreFromText(text, /(robert.?parker|wine advocate|parker|wa)/i);
      const jamesSucklingScore = parseCriticScoreFromText(text, /(james.?suckling|suckling|js)/i);

      if (!robertParkerScore && !jamesSucklingScore) {
        continue;
      }

      return {
        robertParkerScore,
        jamesSucklingScore,
        criticSource: link
      };
    } catch {
      // Ignore candidate page failures and continue to the next result.
    }
  }

  return null;
}

export async function enrichWineWithCriticScores(input: WineInput, options: CriticEnrichmentOptions = {}) {
  let robertParkerScore = input.robertParkerScore || 0;
  let jamesSucklingScore = input.jamesSucklingScore || 0;
  const sourcesUsed: string[] = [];
  const lookupQueries = buildLookupQueries(input);

  for (const source of candidateSources) {
    if (robertParkerScore > 0 && jamesSucklingScore > 0) {
      break;
    }

    for (const query of lookupQueries) {
      if (robertParkerScore > 0 && jamesSucklingScore > 0) {
        break;
      }

      try {
        const result = await fetchCriticSource(source, query);

        if (!result) {
          continue;
        }

        robertParkerScore ||= result.robertParkerScore ?? 0;
        jamesSucklingScore ||= result.jamesSucklingScore ?? 0;

        if (result.criticSource) {
          sourcesUsed.push(result.criticSource);
        }
      } catch {
        // Ignore external critic source failures and keep current/manual values.
      }
    }
  }

  if (options.includeBrowserFallback && (!robertParkerScore || !jamesSucklingScore)) {
    for (const query of lookupQueries) {
      if (robertParkerScore > 0 && jamesSucklingScore > 0) {
        break;
      }

      const result = await fetchPublicCriticScores(query);

      if (!result) {
        continue;
      }

      robertParkerScore ||= result.robertParkerScore ?? 0;
      jamesSucklingScore ||= result.jamesSucklingScore ?? 0;

      if (result.criticSource) {
        sourcesUsed.push(result.criticSource);
      }
    }
  }

  if (options.includeBrowserFallback && (!robertParkerScore || !jamesSucklingScore)) {
    for (const query of lookupQueries) {
      if (robertParkerScore > 0 && jamesSucklingScore > 0) {
        break;
      }

      const result = await fetchWineSearcherBrowserScores(query);

      if (!result) {
        continue;
      }

      robertParkerScore ||= result.robertParkerScore ?? 0;
      jamesSucklingScore ||= result.jamesSucklingScore ?? 0;

      if (result.criticSource) {
        sourcesUsed.push(result.criticSource);
      }
    }
  }

  return {
    ...input,
    robertParkerScore,
    jamesSucklingScore,
    criticSource: sourcesUsed.length > 0 ? Array.from(new Set(sourcesUsed)).join(" + ") : input.criticSource
  };
}
