import { type WineInput } from "@/lib/wine-store";
import { fetchRenderedPage } from "@/lib/rendered-page";

export type CriticScores = {
  robertParkerScore?: number | null;
  jamesSucklingScore?: number | null;
  criticSource?: string;
};

export type MetadataEnrichment = {
  wineName?: string;
  producer?: string;
  region?: string;
  country?: string;
  grape?: string;
  style?: string;
  metadataSource?: string;
};

export type EnrichmentDebugEntry = {
  stage: "metadata" | "critics" | "vivino";
  source: string;
  status: "matched" | "no_match" | "error" | "skipped";
  detail: string;
};

type CriticEnrichmentOptions = {
  includeBrowserFallback?: boolean;
  debugEntries?: EnrichmentDebugEntry[];
};

type CandidateSource = {
  name: string;
  endpoint: string | undefined;
  apiKey: string | undefined;
  host?: string | undefined;
};

type MetadataSource = {
  name: string;
  endpoint: string | undefined;
  apiKey?: string | undefined;
  host?: string | undefined;
};

function pushDebug(
  entries: EnrichmentDebugEntry[] | undefined,
  stage: EnrichmentDebugEntry["stage"],
  source: string,
  status: EnrichmentDebugEntry["status"],
  detail: string
) {
  entries?.push({ stage, source, status, detail });
}

type CriticLookupQuery = {
  wineName: string;
  producer: string;
  vintage: string;
  region?: string;
  country?: string;
};

type ScoreLabel = "rp" | "js";

function buildCombinedQueryText(query: CriticLookupQuery) {
  return [query.producer, query.wineName, query.vintage, query.region, query.country]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const candidateSources: CandidateSource[] = [
  {
    name: "RapidAPI Global Wine Score",
    endpoint: process.env.RAPIDAPI_GLOBAL_WINE_SCORE_URL,
    apiKey: process.env.RAPIDAPI_GLOBAL_WINE_SCORE_KEY || process.env.RAPIDAPI_GLOBAL_WINE_SCORE_API_KEY,
    host: process.env.RAPIDAPI_GLOBAL_WINE_SCORE_HOST
  },
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

const metadataSources: MetadataSource[] = [
  {
    name: "RapidAPI Wine Explorer",
    endpoint: process.env.RAPIDAPI_WINE_API_URL,
    apiKey: process.env.RAPIDAPI_WINE_API_KEY,
    host: process.env.RAPIDAPI_WINE_API_HOST
  },
  {
    name: "RapidAPI Global Wine Score",
    endpoint: process.env.RAPIDAPI_GLOBAL_WINE_SCORE_URL,
    apiKey: process.env.RAPIDAPI_GLOBAL_WINE_SCORE_KEY || process.env.RAPIDAPI_GLOBAL_WINE_SCORE_API_KEY,
    host: process.env.RAPIDAPI_GLOBAL_WINE_SCORE_HOST
  },
  {
    name: "RapidAPI VinHub",
    endpoint: process.env.RAPIDAPI_VINHUB_URL,
    apiKey: process.env.RAPIDAPI_VINHUB_KEY || process.env.RAPIDAPI_VINHUB_API_KEY,
    host: process.env.RAPIDAPI_VINHUB_HOST
  },
  {
    name: "LWIN",
    endpoint: process.env.LWIN_API_URL,
    apiKey: process.env.LWIN_API_KEY
  },
  {
    name: "Open Wine Data",
    endpoint: process.env.OPEN_WINE_DATA_API_URL,
    apiKey: process.env.OPEN_WINE_DATA_API_KEY
  }
];

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

function asciiLookupText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
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

function mapCriticLabel(value: string | null | undefined): ScoreLabel | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();

  if (/(robert.?parker|wine.?advocate|parker|\brp\b|\bwa\b)/i.test(normalized)) {
    return "rp";
  }

  if (/(james.?suckling|suckling|\bjs\b)/i.test(normalized)) {
    return "js";
  }

  return null;
}

function pickObjectString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function pickObjectNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const score = extractNumericScore(record[key]);

    if (score) {
      return score;
    }
  }

  return null;
}

function parseCriticObject(record: Record<string, unknown>) {
  const label = mapCriticLabel(
    pickObjectString(record, ["critic", "reviewer", "source", "name", "provider", "author", "criticName"])
  );
  const score = pickObjectNumber(record, ["score", "rating", "value", "points", "avg", "average", "ratingValue"]);

  if (!label || !score) {
    return null;
  }

  return label === "rp"
    ? { robertParkerScore: score, jamesSucklingScore: null }
    : { robertParkerScore: null, jamesSucklingScore: score };
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
  const objectScores = parseCriticObject(value as Record<string, unknown>);
  let robertParkerScore: number | null = null;
  let jamesSucklingScore: number | null = null;

  robertParkerScore ||= objectScores?.robertParkerScore ?? null;
  jamesSucklingScore ||= objectScores?.jamesSucklingScore ?? null;

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

function extractStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function walkMetadataPayload(value: unknown, trail = ""): MetadataEnrichment {
  if (Array.isArray(value)) {
    return value.reduce<MetadataEnrichment>((result, item, index) => {
      const next = walkMetadataPayload(item, `${trail}[${index}]`);
      return {
        wineName: result.wineName ?? next.wineName,
        producer: result.producer ?? next.producer,
        region: result.region ?? next.region,
        country: result.country ?? next.country,
        grape: result.grape ?? next.grape,
        style: result.style ?? next.style
      };
    }, {});
  }

  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>);
  let wineName: string | undefined;
  let producer: string | undefined;
  let region: string | undefined;
  let country: string | undefined;
  let grape: string | undefined;
  let style: string | undefined;

  for (const [key, nestedValue] of entries) {
    const keyTrail = `${trail}.${key}`.toLowerCase();
    const text = extractStringValue(nestedValue);

    if (!wineName && text && /(wine.?name|label|cuv[eé]e|wine$|name$|full.?name)/i.test(keyTrail)) {
      wineName = text;
    }

    if (!producer && text && /(producer|winery|estate|domain|chateau|bodega)/i.test(keyTrail)) {
      producer = text;
    }

    if (!region && text && /(region|appellation|subregion|ava)/i.test(keyTrail)) {
      region = text;
    }

    if (!country && text && /(country|nation)/i.test(keyTrail)) {
      country = text;
    }

    if (!grape && text && /(grape|varietal|variety)/i.test(keyTrail)) {
      grape = text;
    }

    if (!style && text && /(style|color|type)/i.test(keyTrail)) {
      style = text;
    }

    const nested = walkMetadataPayload(nestedValue, keyTrail);
    wineName ??= nested.wineName;
    producer ??= nested.producer;
    region ??= nested.region;
    country ??= nested.country;
    grape ??= nested.grape;
    style ??= nested.style;
  }

  return { wineName, producer, region, country, grape, style };
}

async function fetchCriticSource(source: CandidateSource, query: CriticLookupQuery) {
  if (!source.endpoint || !source.apiKey) {
    return null;
  }

  const url = new URL(source.endpoint);
  const combinedQuery = buildCombinedQueryText(query);
  const combinedName = [query.producer, query.wineName].filter(Boolean).join(" ").trim();
  const asciiWineName = asciiLookupText(query.wineName);
  const asciiProducer = asciiLookupText(query.producer);
  const asciiCombinedName = asciiLookupText(combinedName || query.wineName);
  const asciiCombinedQuery = asciiLookupText(combinedQuery);

  if (/rapidapi/i.test(source.name) || source.host) {
    if (/wine_name=/i.test(url.pathname)) {
      const encodedTerm = encodeURIComponent(asciiCombinedQuery || asciiCombinedName || asciiWineName || query.wineName);
      url.pathname = url.pathname.replace(/wine_name=[^/]+/i, `wine_name=${encodedTerm}`);
    } else if (!url.searchParams.has("wine_name")) {
      url.searchParams.set("wine_name", asciiCombinedQuery || asciiCombinedName || asciiWineName || query.wineName);
    }

    url.searchParams.set("wineName", asciiCombinedName || combinedName || query.wineName);
    url.searchParams.set("producer", asciiProducer || query.producer);
    url.searchParams.set("vintage", query.vintage);
    url.searchParams.set("q", asciiCombinedQuery || combinedQuery);
    url.searchParams.set("query", asciiCombinedQuery || combinedQuery);
    url.searchParams.set("search", asciiCombinedQuery || combinedQuery);
    url.searchParams.set("name", asciiCombinedName || combinedName || query.wineName);

    if (/global wine score/i.test(source.name)) {
      url.searchParams.set("wine", asciiCombinedName || combinedName || query.wineName);
      url.searchParams.set("winename", asciiCombinedName || combinedName || query.wineName);
      url.searchParams.set("keyword", asciiCombinedQuery || combinedQuery);
      url.searchParams.set("term", asciiCombinedQuery || combinedQuery);
    }
  } else {
    url.searchParams.set("wineName", asciiWineName || query.wineName);
    url.searchParams.set("producer", asciiProducer || query.producer);
    url.searchParams.set("vintage", query.vintage);
    url.searchParams.set("q", asciiCombinedQuery || combinedQuery);
    url.searchParams.set("query", asciiCombinedQuery || combinedQuery);
    url.searchParams.set("search", asciiCombinedQuery || combinedQuery);
    url.searchParams.set("name", asciiCombinedName || combinedName || query.wineName);
    url.searchParams.set("wine", asciiCombinedName || combinedName || query.wineName);
    url.searchParams.set("winename", asciiCombinedName || combinedName || query.wineName);
    url.searchParams.set("keyword", asciiCombinedQuery || combinedQuery);
    url.searchParams.set("term", asciiCombinedQuery || combinedQuery);

    if (query.region) {
      url.searchParams.set("region", asciiLookupText(query.region) || query.region);
    }

    if (query.country) {
      url.searchParams.set("country", asciiLookupText(query.country) || query.country);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${source.apiKey}`,
      "X-API-Key": source.apiKey,
      ...(source.host ? { "X-RapidAPI-Host": source.host } : {}),
      ...(source.apiKey && source.host ? { "X-RapidAPI-Key": source.apiKey } : {}),
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

async function fetchMetadataSource(source: MetadataSource, query: CriticLookupQuery) {
  if (!source.endpoint) {
    return null;
  }

  const url = new URL(source.endpoint);
  const combinedQuery = buildCombinedQueryText(query);
  const combinedName = [query.producer, query.wineName].filter(Boolean).join(" ").trim();
  const asciiWineName = asciiLookupText(query.wineName);
  const asciiProducer = asciiLookupText(query.producer);
  const asciiCombinedName = asciiLookupText(combinedName || query.wineName);
  const asciiCombinedQuery = asciiLookupText(combinedQuery);
  url.searchParams.set("wineName", asciiWineName || query.wineName);
  url.searchParams.set("producer", asciiProducer || query.producer);
  url.searchParams.set("vintage", query.vintage);
  url.searchParams.set("q", asciiCombinedQuery || combinedQuery);
  url.searchParams.set("query", asciiCombinedQuery || combinedQuery);
  url.searchParams.set("search", asciiCombinedQuery || combinedQuery);
  url.searchParams.set("name", asciiCombinedName || combinedName || query.wineName);
  url.searchParams.set("wine_name", asciiCombinedName || combinedName || query.wineName);
  url.searchParams.set("wine", asciiCombinedName || combinedName || query.wineName);
  url.searchParams.set("winename", asciiCombinedName || combinedName || query.wineName);
  url.searchParams.set("keyword", asciiCombinedQuery || combinedQuery);
  url.searchParams.set("term", asciiCombinedQuery || combinedQuery);

  if (query.region) {
    url.searchParams.set("region", asciiLookupText(query.region) || query.region);
  }

  if (query.country) {
    url.searchParams.set("country", asciiLookupText(query.country) || query.country);
  }

  const response = await fetch(url.toString(), {
    headers: {
      ...(source.apiKey ? { Authorization: `Bearer ${source.apiKey}`, "X-API-Key": source.apiKey } : {}),
      ...(source.host && source.apiKey ? { "X-RapidAPI-Host": source.host, "X-RapidAPI-Key": source.apiKey } : {}),
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as unknown;
  const metadata = walkMetadataPayload(payload);

  if (!metadata.wineName && !metadata.producer && !metadata.region && !metadata.country && !metadata.grape && !metadata.style) {
    return null;
  }

  return {
    ...metadata,
    metadataSource: source.name
  };
}

async function fetchWineSearcherPageScores(query: CriticLookupQuery) {
  const url = buildWineSearcherUrl(query);

  if (!url) {
    return null;
  }

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

    const html = await response.text();
    const combinedText = html.replace(/\s+/g, " ");
    const robertParkerScore = parseCriticScoreFromText(combinedText, /(robert.?parker|wine advocate|parker|wa|rp)/i);
    const jamesSucklingScore = parseCriticScoreFromText(combinedText, /(james.?suckling|suckling|js)/i);

    if (!robertParkerScore && !jamesSucklingScore) {
      return null;
    }

    return {
      robertParkerScore,
      jamesSucklingScore,
      criticSource: "Wine-Searcher page"
    };
  } catch {
    return null;
  }
}

async function fetchWineSearcherRenderedScores(query: CriticLookupQuery) {
  const url = buildWineSearcherUrl(query);

  if (!url) {
    return null;
  }

  const page = await fetchRenderedPage(url);

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
  const debugEntries = options.debugEntries;

  for (const source of candidateSources) {
    if (robertParkerScore > 0 && jamesSucklingScore > 0) {
      break;
    }

    if (!source.endpoint || !source.apiKey) {
      pushDebug(debugEntries, "critics", source.name, "skipped", "Not configured.");
      continue;
    }

    let matched = false;
    let lastError = "";

    for (const query of lookupQueries) {
      if (robertParkerScore > 0 && jamesSucklingScore > 0) {
        break;
      }

      try {
        const result = await fetchCriticSource(source, query);

        if (!result) {
          continue;
        }

        matched = true;

        robertParkerScore ||= result.robertParkerScore ?? 0;
        jamesSucklingScore ||= result.jamesSucklingScore ?? 0;

        if (result.criticSource) {
          sourcesUsed.push(result.criticSource);
        }

        pushDebug(
          debugEntries,
          "critics",
          source.name,
          "matched",
          `Matched query "${buildCombinedQueryText(query)}" with RP ${result.robertParkerScore ?? 0}, JS ${result.jamesSucklingScore ?? 0}.`
        );
      } catch {
        lastError = `Request failed for "${buildCombinedQueryText(query)}".`;
      }
    }

    if (!matched) {
      pushDebug(debugEntries, "critics", source.name, lastError ? "error" : "no_match", lastError || "Configured, but returned no critic scores.");
    }
  }

  if (!robertParkerScore || !jamesSucklingScore) {
    let matched = false;
    for (const query of lookupQueries) {
      if (robertParkerScore > 0 && jamesSucklingScore > 0) {
        break;
      }

      const result = await fetchPublicCriticScores(query);

      if (!result) {
        continue;
      }

      matched = true;

      robertParkerScore ||= result.robertParkerScore ?? 0;
      jamesSucklingScore ||= result.jamesSucklingScore ?? 0;

      if (result.criticSource) {
        sourcesUsed.push(result.criticSource);
      }

      pushDebug(debugEntries, "critics", "Public search fallback", "matched", `Matched query "${buildCombinedQueryText(query)}".`);
    }

    if (!matched) {
      pushDebug(debugEntries, "critics", "Public search fallback", "no_match", "No public critic score snippets were found.");
    }
  }

  if (options.includeBrowserFallback && (!robertParkerScore || !jamesSucklingScore)) {
    let matched = false;
    for (const query of lookupQueries) {
      if (robertParkerScore > 0 && jamesSucklingScore > 0) {
        break;
      }

      const result = await fetchWineSearcherPageScores(query);

      if (!result) {
        continue;
      }

      matched = true;

      robertParkerScore ||= result.robertParkerScore ?? 0;
      jamesSucklingScore ||= result.jamesSucklingScore ?? 0;

      if (result.criticSource) {
        sourcesUsed.push(result.criticSource);
      }

      pushDebug(debugEntries, "critics", "Wine-Searcher page", "matched", `Matched query "${buildCombinedQueryText(query)}".`);
    }

    if (!matched) {
      pushDebug(debugEntries, "critics", "Wine-Searcher page", "no_match", "No page-level RP/JS scores were parsed.");
    }
  }

  if (options.includeBrowserFallback && (!robertParkerScore || !jamesSucklingScore)) {
    let matched = false;
    for (const query of lookupQueries) {
      if (robertParkerScore > 0 && jamesSucklingScore > 0) {
        break;
      }

      const result = await fetchWineSearcherRenderedScores(query);

      if (!result) {
        continue;
      }

      matched = true;

      robertParkerScore ||= result.robertParkerScore ?? 0;
      jamesSucklingScore ||= result.jamesSucklingScore ?? 0;

      if (result.criticSource) {
        sourcesUsed.push(result.criticSource);
      }

      pushDebug(debugEntries, "critics", "Wine-Searcher browser", "matched", `Matched query "${buildCombinedQueryText(query)}".`);
    }

    if (!matched) {
      pushDebug(debugEntries, "critics", "Wine-Searcher browser", "no_match", "No browser-rendered RP/JS scores were parsed.");
    }
  }

  return {
    ...input,
    robertParkerScore,
    jamesSucklingScore,
    criticSource: sourcesUsed.length > 0 ? Array.from(new Set(sourcesUsed)).join(" + ") : input.criticSource
  };
}

export async function enrichWineWithMetadataSources(input: WineInput, debugEntries?: EnrichmentDebugEntry[]) {
  const needsMetadata = !input.region || !input.country || !input.grape || !input.style;

  if (!needsMetadata) {
    pushDebug(debugEntries, "metadata", "Metadata enrichment", "skipped", "Metadata already present.");
    return input;
  }

  const lookupQueries = buildLookupQueries(input);

  for (const source of metadataSources) {
    if (!source.endpoint) {
      pushDebug(debugEntries, "metadata", source.name, "skipped", "Not configured.");
      continue;
    }

    let matched = false;
    let lastError = "";
    for (const query of lookupQueries) {
      try {
        const result = await fetchMetadataSource(source, query);

        if (!result) {
          continue;
        }

        matched = true;
        pushDebug(debugEntries, "metadata", source.name, "matched", `Matched query "${buildCombinedQueryText(query)}".`);

        return {
          ...input,
          wineName: input.wineName || result.wineName || "",
          producer: input.producer || result.producer || "",
          region: input.region || result.region || "",
          country: input.country || result.country || "",
          grape: input.grape || result.grape || "",
          style: input.style || result.style || "",
          criticSource: input.criticSource || result.metadataSource || ""
        };
      } catch {
        lastError = `Request failed for "${buildCombinedQueryText(query)}".`;
      }
    }

    if (!matched) {
      pushDebug(debugEntries, "metadata", source.name, lastError ? "error" : "no_match", lastError || "Configured, but returned no metadata.");
    }
  }

  return input;
}
