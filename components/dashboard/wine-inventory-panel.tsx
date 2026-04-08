"use client";

import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Camera, Eye, Pencil, Plus, RefreshCw, Trash2, Wine } from "lucide-react";

import { KpiCard } from "@/components/cards/kpi-card";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { getWineDisplayTitle } from "@/lib/wine-display";
import { formatWinePlacement } from "@/lib/wine-location-display";
import { getPrimaryCellarScore, getVivinoPortfolioScore } from "@/lib/wine-score";
import { isCellarWine, type StorageLocation, type WineBottle } from "@/lib/wine-data";
import { inferReadinessFromVintage } from "@/lib/wine-readiness";
import { type EnrichmentDebugEntry } from "@/lib/critic-sources";

const readinessOptions = ["Hold", "Ready", "Peak"] as const;
const grapeOptions = [
  "Aglianico",
  "Cabernet Franc",
  "Cabernet Sauvignon",
  "Carignan",
  "Chardonnay",
  "Chenin Blanc",
  "Gamay",
  "Grenache",
  "Malbec",
  "Merlot",
  "Moscato Bianco",
  "Mourvedre",
  "Nebbiolo",
  "Petite Sirah",
  "Pinot Noir",
  "Primitivo",
  "Riesling",
  "Sangiovese",
  "Sauvignon Blanc",
  "Semillon",
  "Syrah",
  "Tempranillo",
  "Viognier",
  "Blend",
  "Other"
] as const satisfies readonly string[];
const sortedGrapeOptions = [...grapeOptions].sort((a, b) => a.localeCompare(b));
const regionOptions = [
  "Aconcagua",
  "Alsace",
  "Barbaresco",
  "Barolo",
  "Bekaa Valley",
  "Bolgheri",
  "Bordeaux",
  "Burgundy",
  "Campania",
  "Champagne",
  "Chablis",
  "Chianti Classico",
  "Colchagua Valley",
  "Coonawarra",
  "Douro",
  "Eden Valley",
  "Etna",
  "Galilee",
  "Golan Heights",
  "Judean Hills",
  "Jura",
  "Langhe",
  "Loire Valley",
  "Lower Galilee",
  "Maipo Valley",
  "Marlborough",
  "Mendoza",
  "McLaren Vale",
  "Mosel",
  "Nahe",
  "Napa Valley",
  "Negev",
  "Paarl",
  "Paso Robles",
  "Priorat",
  "Provence",
  "Rheingau",
  "Rhone",
  "Ribera del Duero",
  "Rioja",
  "Sicily",
  "Sonoma",
  "South Israel",
  "South Italy",
  "Stellenbosch",
  "Swartland",
  "Tuscany",
  "Upper Galilee",
  "Veneto",
  "Victoria",
  "Willamette Valley",
  "Wachau",
  "Yarra Valley",
  "Other"
].sort((a, b) => a.localeCompare(b)) as string[];
const countryOptions = [
  "Israel",
  "Italy",
  "France",
  "Argentina",
  "Australia",
  "Austria",
  "Brazil",
  "Chile",
  "China",
  "Georgia",
  "Germany",
  "Greece",
  "Hungary",
  "Moldova",
  "New Zealand",
  "Portugal",
  "Romania",
  "South Africa",
  "Spain",
  "United States",
  "Other"
] as const;
const styleOptions = ["Red", "White", "Rose", "Other"] as const;

type WineFormState = {
  wineName: string;
  producer: string;
  imageUrl: string;
  vintage: string;
  region: string;
  country: string;
  grape: string;
  grapeVarieties: string;
  style: string;
  bottleSize: string;
  quantity: string;
  purchasePrice: string;
  estimatedValue: string;
  vivinoLink: string;
  vivinoScore: string;
  vivinoScoreSource: string;
  robertParkerScore: string;
  jamesSucklingScore: string;
  criticSource: string;
  locationId: string;
  shelf: string;
  slot: string;
  readiness: (typeof readinessOptions)[number];
  drinkWindow: string;
  acquiredOn: string;
  supplierId: string;
  notes: string;
};

const emptyForm: WineFormState = {
  wineName: "",
  producer: "",
  imageUrl: "",
  vintage: "",
  region: "",
  country: "",
  grape: "",
  grapeVarieties: "",
  style: "",
  bottleSize: "750ml",
  quantity: "1",
  purchasePrice: "",
  estimatedValue: "",
  vivinoLink: "",
  vivinoScore: "",
  vivinoScoreSource: "",
  robertParkerScore: "",
  jamesSucklingScore: "",
  criticSource: "",
  locationId: "",
  shelf: "",
  slot: "",
  readiness: "Ready",
  drinkWindow: "",
  acquiredOn: new Date().toISOString().slice(0, 10),
  supplierId: "",
  notes: ""
};

function normalizeGrape(value: string | undefined) {
  const nextValue = value?.trim() ?? "";

  if (!nextValue) {
    return "";
  }

  if (/blend/i.test(nextValue)) {
    return "Blend";
  }

  return grapeOptions.includes(nextValue as (typeof grapeOptions)[number]) ? nextValue : "Other";
}

function normalizeRegion(value: string | undefined) {
  const nextValue = value?.trim() ?? "";
  return nextValue && regionOptions.includes(nextValue as (typeof regionOptions)[number]) ? nextValue : nextValue ? "Other" : "";
}

function normalizeCountry(value: string | undefined) {
  const nextValue = value?.trim() ?? "";
  return nextValue && countryOptions.includes(nextValue as (typeof countryOptions)[number]) ? nextValue : nextValue ? "Other" : "";
}

function normalizeStyle(value: string | undefined) {
  const nextValue = value?.trim() ?? "";
  return nextValue && styleOptions.includes(nextValue as (typeof styleOptions)[number]) ? nextValue : nextValue ? "Other" : "";
}

function toFormState(wine: Partial<WineBottle>, locations: StorageLocation[]): WineFormState {
  return {
    wineName: wine.wineName ?? "",
    producer: wine.producer ?? "",
    imageUrl: wine.imageUrl ?? "",
    vintage: wine.vintage ? String(wine.vintage) : "",
    region: normalizeRegion(wine.region),
    country: normalizeCountry(wine.country),
    grape: normalizeGrape(wine.grape),
    grapeVarieties: wine.grapeVarieties ?? "",
    style: normalizeStyle(wine.style),
    bottleSize: wine.bottleSize ?? "750ml",
    quantity: String(wine.quantity ?? 1),
    purchasePrice: wine.purchasePrice && wine.purchasePrice > 0 ? String(wine.purchasePrice) : "",
    estimatedValue: wine.estimatedValue && wine.estimatedValue > 0 ? String(wine.estimatedValue) : "",
    vivinoLink: wine.vivinoLink ?? "",
    vivinoScore: wine.vivinoScore && wine.vivinoScore > 0 ? String(wine.vivinoScore) : "",
    vivinoScoreSource: wine.vivinoScoreSource ?? "",
    robertParkerScore: wine.robertParkerScore && wine.robertParkerScore > 0 ? String(wine.robertParkerScore) : "",
    jamesSucklingScore: wine.jamesSucklingScore && wine.jamesSucklingScore > 0 ? String(wine.jamesSucklingScore) : "",
    criticSource: wine.criticSource ?? "",
    locationId: wine.locationId ?? locations[0]?.id ?? "",
    shelf: wine.shelf ?? "",
    slot: wine.slot ?? "",
    readiness: (wine.readiness as WineFormState["readiness"]) ?? "Ready",
    drinkWindow: wine.drinkWindow ?? "",
    acquiredOn: wine.acquiredOn ?? new Date().toISOString().slice(0, 10),
    supplierId: wine.supplierId ?? "",
    notes: wine.notes ?? ""
  };
}

function getReadinessVariant(readiness: WineBottle["readiness"]) {
  if (readiness === "Peak") {
    return "danger";
  }

  if (readiness === "Ready") {
    return "warning";
  }

  return "info";
}

function scoreOcrText(text: string) {
  const trimmed = text.replace(/\s+/g, " ").trim();

  if (!trimmed) {
    return 0;
  }

  const alphaMatches = trimmed.match(/[A-Za-z]/g) ?? [];
  const weirdMatches = trimmed.match(/[^A-Za-z0-9\s,'’.&\-()/]/g) ?? [];
  const wordMatches = trimmed.match(/[A-Za-z]{3,}/g) ?? [];

  return alphaMatches.length * 2 + wordMatches.length * 12 - weirdMatches.length * 5;
}

function extractVintageCandidate(text: string) {
  const matches = Array.from(text.matchAll(/\b(19[5-9]\d|20[0-2]\d|2030)\b/g)).map((match) => match[1]);
  return matches.at(0) ?? "";
}

const ocrKeywordSet = Array.from(
  new Set(
    [
      ...grapeOptions,
      ...regionOptions,
      ...countryOptions,
      "barolo",
      "barbaresco",
      "brunello",
      "montalcino",
      "chianti",
      "rioja",
      "bourgogne",
      "burgundy",
      "bordeaux",
      "pauillac",
      "margaux",
      "castiglione",
      "vietti",
      "chateau",
      "castello",
      "tenuta",
      "rosso",
      "bianco",
      "riserva",
      "denominazione",
      "origine",
      "controllata",
      "garantita",
      "prodotto"
    ]
      .flatMap((value) => value.toLowerCase().split(/[\s/()-]+/))
      .filter((value) => value.length >= 3)
  )
);

function isLikelyUsefulOcrLine(line: string) {
  const compact = line.replace(/\s+/g, " ").trim();

  if (!compact) {
    return false;
  }

  const alphaCount = compact.match(/[A-Za-z]/g)?.length ?? 0;
  const weirdCount = compact.match(/[^A-Za-z0-9\s,'’.&\-()/]/g)?.length ?? 0;
  const tokenCount = compact.split(/\s+/).length;
  const singleCharTokens = compact.split(/\s+/).filter((token) => token.length === 1).length;
  const hasVintage = /\b(19|20)\d{2}\b/.test(compact);
  const hasKeyword = ocrKeywordSet.some((keyword) => compact.toLowerCase().includes(keyword));
  const alphaRatio = alphaCount / Math.max(compact.length, 1);

  if (hasVintage || hasKeyword) {
    return true;
  }

  if (alphaCount < 5) {
    return false;
  }

  if (weirdCount > Math.max(3, compact.length * 0.1)) {
    return false;
  }

  if (tokenCount > 0 && singleCharTokens / tokenCount > 0.35) {
    return false;
  }

  return alphaRatio > 0.55;
}

type OcrLineLike = {
  text?: string;
  confidence?: number;
  bbox?: {
    x0?: number;
    y0?: number;
    x1?: number;
    y1?: number;
  };
};

function extractLargestOcrLines(lines: OcrLineLike[] | undefined, fallbackText: string) {
  const normalizedFromLines =
    lines
      ?.map((line) => {
        const text = line.text?.replace(/\s+/g, " ").trim() ?? "";
        const width = Math.max(0, (line.bbox?.x1 ?? 0) - (line.bbox?.x0 ?? 0));
        const height = Math.max(0, (line.bbox?.y1 ?? 0) - (line.bbox?.y0 ?? 0));
        const keywordHits = ocrKeywordSet.filter((keyword) => text.toLowerCase().includes(keyword)).length;
        const vintage = extractVintageCandidate(text);

        return {
          text,
          y: line.bbox?.y0 ?? 0,
          prominence: height * 3 + width * 0.015 + (line.confidence ?? 0) * 2 + keywordHits * 40 + (vintage ? 80 : 0)
        };
      })
      .filter((line) => line.text && isLikelyUsefulOcrLine(line.text))
      .sort((left, right) => right.prominence - left.prominence) ?? [];

  if (normalizedFromLines.length > 0) {
    return normalizedFromLines
      .slice(0, 4)
      .sort((left, right) => left.y - right.y)
      .map((line) => line.text);
  }

  return fallbackText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line && isLikelyUsefulOcrLine(line))
    .slice(0, 4);
}

function extractPromisingOcrText(text: string) {
  const normalizedLines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (normalizedLines.length === 0) {
    return "";
  }

  const scoredLines = normalizedLines
    .filter(isLikelyUsefulOcrLine)
    .map((line) => {
      const lower = line.toLowerCase();
      const keywordHits = ocrKeywordSet.filter((keyword) => lower.includes(keyword)).length;
      const hasVintage = /\b(19|20)\d{2}\b/.test(line);
      const upperWords = line.match(/\b[A-Z][A-Z'’.-]{2,}\b/g)?.length ?? 0;
      const alphaRatio = (line.match(/[A-Za-z]/g)?.length ?? 0) / Math.max(line.length, 1);
      const weirdCount = line.match(/[^A-Za-z0-9\s,'’.&\-()/]/g)?.length ?? 0;
      const titleCaseWords = line.match(/\b[A-Z][a-z]{2,}\b/g)?.length ?? 0;
      const docMatches = line.match(/\bDOCG?\b/gi)?.length ?? 0;
      const producerLikeWords = line.match(/\b[A-Z][A-Za-z'’.-]{4,}\b/g)?.length ?? 0;

      return {
        line,
        score:
          scoreOcrText(line) +
          keywordHits * 40 +
          upperWords * 8 +
          titleCaseWords * 10 +
          producerLikeWords * 6 +
          docMatches * 25 +
          (hasVintage ? 30 : 0) +
          (alphaRatio > 0.55 ? 20 : 0) -
          weirdCount * 10
      };
    })
    .filter((entry) => entry.score > 10)
    .sort((left, right) => right.score - left.score);

  if (scoredLines.length === 0) {
    const fallback = normalizedLines.filter((line) => /[A-Za-z]{3,}/.test(line)).slice(0, 4);
    return fallback.join(" ").trim();
  }

  const selected = scoredLines.slice(0, 6).map((entry) => entry.line);
  return Array.from(new Set(selected)).join(" ").trim();
}

async function preprocessImageForOcr(dataUrl: string) {
  const image = new Image();
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to decode image for OCR."));
    image.src = dataUrl;
  });

  const scale = Math.max(2, image.width < 1200 ? 3 : 2);
  const canvas = document.createElement("canvas");
  canvas.width = image.width * scale;
  canvas.height = image.height * scale;
  const context = canvas.getContext("2d");

  if (!context) {
    return dataUrl;
  }

  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const grayscale = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const boosted = grayscale > 160 ? 255 : grayscale < 90 ? 0 : grayscale;

    data[index] = boosted;
    data[index + 1] = boosted;
    data[index + 2] = boosted;
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

async function buildOcrCandidateImages(dataUrl: string) {
  const image = new Image();
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to decode image for OCR."));
    image.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return [dataUrl];
  }

  const cropToDataUrl = (sx: number, sy: number, sw: number, sh: number) => {
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  };

  const rotateDataUrl = (sourceDataUrl: string, degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    const sourceImage = new Image();
    sourceImage.src = sourceDataUrl;
    canvas.width = image.width;
    canvas.height = image.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(radians);
    context.drawImage(sourceImage, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    context.restore();
    return canvas.toDataURL("image/png");
  };

  const fullWidth = image.width;
  const fullHeight = image.height;
  const centerLabel = cropToDataUrl(fullWidth * 0.12, fullHeight * 0.2, fullWidth * 0.76, fullHeight * 0.64);
  const candidates = [
    centerLabel,
    dataUrl,
    cropToDataUrl(fullWidth * 0.08, fullHeight * 0.12, fullWidth * 0.84, fullHeight * 0.76),
    cropToDataUrl(fullWidth * 0.16, fullHeight * 0.24, fullWidth * 0.68, fullHeight * 0.56),
    cropToDataUrl(fullWidth * 0.14, fullHeight * 0.46, fullWidth * 0.72, fullHeight * 0.28),
    cropToDataUrl(fullWidth * 0.16, fullHeight * 0.62, fullWidth * 0.68, fullHeight * 0.22),
    rotateDataUrl(centerLabel, -3),
    rotateDataUrl(centerLabel, 3)
  ];

  return Array.from(new Set(candidates));
}

export function WineInventoryPanel({ query = "", action }: { query?: string; action?: string }) {
  const {
    wines,
    locations,
    winesError,
    locationsError,
    refreshWines,
    refreshLocations,
    upsertWine,
    removeWineFromState
  } = useDashboardData();
  const [inventoryTab, setInventoryTab] = useState<"cellar" | "drank">("cellar");
  const [locationFilter, setLocationFilter] = useState("all");
  const [readinessFilter, setReadinessFilter] = useState<"all" | WineBottle["readiness"]>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [editingWine, setEditingWine] = useState<WineBottle | null>(null);
  const [viewingWine, setViewingWine] = useState<WineBottle | null>(null);
  const [form, setForm] = useState<WineFormState>(emptyForm);
  const [scanText, setScanText] = useState("");
  const [scanImageUrl, setScanImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanOcrStatus, setScanOcrStatus] = useState<string | null>(null);
  const [isScanOcrPending, setIsScanOcrPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [wineStatusById, setWineStatusById] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const uploadScanInputRef = useRef<HTMLInputElement | null>(null);
  const captureScanInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = query.trim().toLowerCase();

  const readResponsePayload = async <T,>(response: Response) => {
    const text = await response.text();

    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return { error: "The server returned an invalid response." } as T;
    }
  };

  const buildNoScoreMessage = (entries: EnrichmentDebugEntry[]) => {
    const apifyEntry = entries.find((entry) => entry.source === "Vivino Apify" && entry.status !== "skipped");

    if (apifyEntry?.status === "error") {
      return `Apify Vivino lookup failed: ${apifyEntry.detail}`;
    }

    if (apifyEntry?.status === "no_match") {
      return "Apify ran, but returned no usable Vivino score for this wine. You can enter the Vivino score manually.";
    }

    if (apifyEntry?.status === "matched") {
      return "Vivino score lookup completed, but no score was saved. Please retry once, and if it repeats use manual score entry.";
    }

    const hasConfiguredAutomaticSource = entries.some(
      (entry) =>
        (entry.stage === "critics" || entry.stage === "vivino") &&
        !/not configured/i.test(entry.detail) &&
        entry.status !== "skipped"
    );

    if (!hasConfiguredAutomaticSource) {
      return "No automatic score source configured. Add a Global Wine Score API connection, or use the manual RP/JS fields.";
    }

    return "No scores found from the currently configured automatic sources. You can enter RP/JS manually.";
  };

  const setWineStatus = (wineId: string, message: string | null) => {
    setWineStatusById((current) => {
      const next = { ...current };

      if (!message) {
        delete next[wineId];
        return next;
      }

      next[wineId] = message;
      return next;
    });
  };

  useEffect(() => {
    setForm((current) =>
      current.locationId || locations.length === 0
        ? current
        : {
            ...current,
            locationId: locations[0].id
          }
    );
  }, [locations]);

  useEffect(() => {
    if (action === "scan") {
      openScanDialog();
      return;
    }

    if (action === "add") {
      openCreateDialog();
    }
  }, [action]);

  const applyFilters = (candidateWines: WineBottle[]) =>
    candidateWines.filter((wine) => {
      const location = locations.find((item) => item.id === wine.locationId);
      const matchesQuery =
        !normalizedQuery ||
        [
          wine.wineName,
          wine.producer,
          wine.region,
          wine.country,
          wine.grape,
          wine.style,
          location?.name ?? "",
          wine.shelf,
          wine.slot
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      const matchesLocation = locationFilter === "all" || wine.locationId === locationFilter;
      const matchesReadiness = readinessFilter === "all" || wine.readiness === readinessFilter;

      return matchesQuery && matchesLocation && matchesReadiness;
    });

  const cellarWines = useMemo(() => wines.filter(isCellarWine), [wines]);
  const drankWines = useMemo(() => wines.filter((wine) => !isCellarWine(wine)), [wines]);

  const filteredCellarWines = useMemo(
    () =>
      applyFilters(cellarWines),
    [cellarWines, locationFilter, locations, normalizedQuery, readinessFilter]
  );

  const filteredDrankWines = useMemo(
    () => applyFilters(drankWines),
    [drankWines, locationFilter, locations, normalizedQuery, readinessFilter]
  );

  const visibleWines = inventoryTab === "cellar" ? filteredCellarWines : filteredDrankWines;
  const visibleError = error ?? winesError ?? locationsError;

  const analyticsWines = inventoryTab === "cellar" ? filteredCellarWines : filteredDrankWines;
  const totalBottles = analyticsWines.reduce((sum, wine) => sum + wine.quantity, 0);
  const currentValue = analyticsWines.reduce((sum, wine) => sum + wine.estimatedValue * wine.quantity, 0);
  const scoredWines = analyticsWines
    .map((wine) => getVivinoPortfolioScore(wine))
    .filter((score): score is number => score !== null);
  const averageScore = scoredWines.length > 0 ? scoredWines.reduce((sum, score) => sum + score, 0) / scoredWines.length : 0;
  const averageScoreLabel =
    scoredWines.length > 0
      ? `Vivino average across visible ${inventoryTab === "cellar" ? "cellar" : "drank"} labels`
      : `No Vivino scores available in this ${inventoryTab === "cellar" ? "cellar" : "drank"} view`;
  const readyCount = analyticsWines.filter((wine) => wine.readiness !== "Hold").length;
  const kpiLabels =
    inventoryTab === "cellar"
      ? {
          bottles: "Filtered Bottles",
          value: "Inventory Value",
          score: "Average Score",
          readiness: "Ready Or Peak"
        }
      : {
          bottles: "Drank Filtered Bottles",
          value: "Drank Value",
          score: "Drank Average Score",
          readiness: "Drank Ready Or Peak"
        };

  const updateForm = (key: keyof WineFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "vintage"
        ? {
            readiness: value.trim() && Number.isFinite(Number(value)) ? inferReadinessFromVintage(Number(value)) : "Ready"
          }
        : {})
    }));
  };

  const readImageFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Unable to read image file."));
      reader.readAsDataURL(file);
    });

  const updateWineImage = async (file: File | null) => {
    if (!file) {
      updateForm("imageUrl", "");
      return;
    }

    try {
      updateForm("imageUrl", await readImageFile(file));
    } catch {
      setError("Unable to load that bottle image.");
    }
  };

  const updateScanImage = async (file: File | null) => {
    if (!file) {
      setScanImageUrl("");
      setScanOcrStatus(null);
      return;
    }

    try {
      setScanError(null);
      const imageDataUrl = await readImageFile(file);
      setScanImageUrl(imageDataUrl);
      setScanOcrStatus("Bottle photo attached. Add optional notes if you want, then generate the draft.");
    } catch {
      setScanError("Unable to load that bottle image.");
      setScanOcrStatus(null);
    } finally {
      setIsScanOcrPending(false);
    }
  };

  const resetForm = () => {
    setForm({
      ...emptyForm,
      locationId: locations[0]?.id ?? ""
    });
    setEditingWine(null);
    setError(null);
    setScanImageUrl("");
  };

  const resetScanAssist = () => {
    setScanText("");
    setScanImageUrl("");
    setScanError(null);
    setScanOcrStatus(null);
    setIsScanOcrPending(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setStatusMessage(null);
    setDialogOpen(true);
  };

  const openScanDialog = () => {
    resetScanAssist();
    setStatusMessage(null);
    setScanDialogOpen(true);
  };

  const openEditDialog = (wine: WineBottle) => {
    setEditingWine(wine);
    setViewingWine(null);
    setForm(toFormState(wine, locations));
    setError(null);
    setStatusMessage(null);
    setDialogOpen(true);
  };

  const openViewDialog = (wine: WineBottle) => {
    setViewingWine(wine);
    setViewDialogOpen(true);
  };

  const submitWine = () => {
    if (!form.wineName.trim() || !form.producer.trim()) {
      setError("Wine name and producer are required.");
      return;
    }

    setError(null);
    setStatusMessage(null);
    startTransition(async () => {
      const hasManualCriticScores = Number(form.robertParkerScore || 0) > 0 || Number(form.jamesSucklingScore || 0) > 0;
      const hasManualVivinoScore =
        Number(form.vivinoScore || 0) > 0 &&
        (!editingWine || Number(form.vivinoScore || 0) !== (editingWine.vivinoScore || 0) || editingWine.vivinoScoreSource === "Manual");
      const response = await fetch(editingWine ? `/api/wines/${editingWine.id}` : "/api/wines", {
        method: editingWine ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          wineName: form.wineName,
          producer: form.producer,
          imageUrl: form.imageUrl,
          vintage: form.vintage.trim() ? Number(form.vintage) : undefined,
          region: form.region,
          country: form.country,
          grape: form.grape,
          grapeVarieties: form.grapeVarieties,
          style: form.style,
          bottleSize: form.bottleSize,
          quantity: Number(form.quantity),
          purchasePrice: Number(form.purchasePrice || 0),
          estimatedValue: Number(form.estimatedValue || 0),
          vivinoLink: form.vivinoLink,
          vivinoScore: Number(form.vivinoScore || 0),
          vivinoScoreSource: hasManualVivinoScore || form.vivinoScoreSource === "Manual" ? "Manual" : form.vivinoScoreSource,
          robertParkerScore: Number(form.robertParkerScore || 0),
          jamesSucklingScore: Number(form.jamesSucklingScore || 0),
          criticSource: form.criticSource || (hasManualCriticScores ? "Manual" : ""),
          locationId: form.locationId,
          shelf: form.shelf,
          slot: form.slot,
          readiness: form.readiness,
          drinkWindow: form.drinkWindow,
          acquiredOn: form.acquiredOn,
          supplierId: form.supplierId,
          notes: form.notes
        })
      });

      if (!response.ok) {
        const payload = await readResponsePayload<{ error?: string }>(response);
        setError(payload.error ?? "Unable to save this wine.");
        return;
      }

      const payload = await readResponsePayload<{ data?: WineBottle }>(response);
      const savedWine = payload.data;

      await Promise.all([refreshWines(), refreshLocations()]).catch(() => undefined);
      setDialogOpen(false);
      resetForm();

      if (savedWine) {
        void (async () => {
          const enrichResponse = await fetch(`/api/wines/${savedWine.id}/enrich`, {
            method: "POST"
          });

          if (enrichResponse.ok) {
            const enrichPayload = await readResponsePayload<{ data?: WineBottle; debug?: EnrichmentDebugEntry[] }>(enrichResponse);

            if (enrichPayload.data) {
              upsertWine(enrichPayload.data);
            }

            if (
              enrichPayload.data &&
              enrichPayload.data.vivinoScore <= 0 &&
              enrichPayload.data.robertParkerScore <= 0 &&
              enrichPayload.data.jamesSucklingScore <= 0 &&
              enrichPayload.debug?.length
            ) {
              setStatusMessage(buildNoScoreMessage(enrichPayload.debug));
            } else if (enrichPayload.data && enrichPayload.data.grapeVarieties && !enrichPayload.data.vivinoScore && !hasManualCriticScores && !hasManualVivinoScore) {
              setStatusMessage("Wine saved. Grape varieties were enriched automatically.");
            }
            return;
          }

          const enrichPayload = await readResponsePayload<{ error?: string }>(enrichResponse);
          if (enrichPayload.error) {
            setError(enrichPayload.error);
          }
        })();
      }

      if (savedWine && (hasManualCriticScores || hasManualVivinoScore)) {
        setStatusMessage(
          hasManualCriticScores && hasManualVivinoScore
            ? "Wine saved with manual Vivino and critic scores."
            : hasManualVivinoScore
              ? "Wine saved with a manual Vivino score."
              : "Wine saved with manual critic scores."
        );
      }
    });
  };

  const removeWine = (wine: WineBottle) => {
      const confirmed = window.confirm(`Delete ${wine.producer} ${wine.wineName}?`);

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setStatusMessage(null);
      await fetch(`/api/wines/${wine.id}`, { method: "DELETE" });
      removeWineFromState(wine.id);
      await refreshLocations().catch(() => undefined);
    });
  };

  const markAsDrank = (wine: WineBottle) => {
    const confirmed = window.confirm(`Mark ${wine.producer} ${wine.wineName} as drank?`);

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setStatusMessage(null);
      const response = await fetch(`/api/wines/${wine.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cellarStatus: "Drank",
          drankOn: new Date().toISOString().slice(0, 10)
        })
      });

      if (!response.ok) {
        setError("Unable to move this wine to Drank.");
        return;
      }

      await refreshWines().catch(() => undefined);
      await refreshLocations().catch(() => undefined);
      setInventoryTab("drank");
    });
  };

  const refreshVivino = (wine: WineBottle) => {
    startTransition(async () => {
      setStatusMessage(null);
      const response = await fetch(`/api/wines/${wine.id}/enrich`, {
        method: "POST"
      });

      if (!response.ok) {
        const payload = await readResponsePayload<{ error?: string }>(response);
        const message = payload.error ?? "Unable to refresh external scores for this wine.";
        setStatusMessage(message);
        setWineStatus(wine.id, message);
        return;
      }

      const payload = await readResponsePayload<{ data?: WineBottle; debug?: EnrichmentDebugEntry[] }>(response);

      if (payload.data) {
        upsertWine(payload.data);
      }

      if (
        payload.data &&
        payload.data.vivinoScore <= 0 &&
        payload.data.robertParkerScore <= 0 &&
        payload.data.jamesSucklingScore <= 0 &&
        payload.debug?.length
      ) {
        const message = buildNoScoreMessage(payload.debug);
        setStatusMessage(message);
        setWineStatus(wine.id, message);
      } else if (payload.data) {
        const badges = [
          payload.data.vivinoScore > 0 ? `Vivino ${payload.data.vivinoScore.toFixed(1)}` : "",
          payload.data.robertParkerScore > 0 ? `RP ${payload.data.robertParkerScore}` : "",
          payload.data.jamesSucklingScore > 0 ? `JS ${payload.data.jamesSucklingScore}` : ""
        ].filter(Boolean);

        const message = badges.length > 0 ? `Scores updated: ${badges.join(" | ")}` : "Refresh completed.";
        setStatusMessage(message);
        setWineStatus(wine.id, message);
      }
    });
  };

  const generateDraftFromScan = () => {
    if (!scanText.trim() && !scanImageUrl) {
      setScanError("Upload an image or use Capture first.");
      return;
    }

    setScanError(null);
    startTransition(async () => {
      const response = await fetch("/api/wines/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rawText: scanText,
          imageUrl: scanImageUrl
        })
      });

      if (!response.ok) {
        const payload = await readResponsePayload<{ error?: string }>(response);
        setScanError(payload.error ?? "Unable to generate a draft from that bottle image.");
        return;
      }

      const payload = (await response.json()) as { data?: Partial<WineBottle>; extractedText?: string };

      setForm(toFormState(payload.data ?? {}, locations));
      setScanText(payload.extractedText ?? scanText);
      setEditingWine(null);
      setScanDialogOpen(false);
      resetScanAssist();
      setDialogOpen(true);

      if (editingWine) {
        setStatusMessage("Bottle draft updated from scanned label text.");
      } else {
        setStatusMessage(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Inventory</p>
        <h2 className="text-3xl font-semibold tracking-tight">Track every bottle by fridge, shelf, value, and critic.</h2>
      </section>

      <div className="flex flex-col gap-3 md:flex-row">
        <Button variant="outline" onClick={openScanDialog}>
          <Camera className="h-4 w-4" />
          Scan Assist
        </Button>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Add Wine
        </Button>
      </div>

      {visibleError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {visibleError}
        </div>
      ) : null}

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardDescription>Inventory Views</CardDescription>
            <CardTitle>{inventoryTab === "cellar" ? "In Cellar" : "Drank"}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={inventoryTab === "cellar" ? "default" : "outline"} onClick={() => setInventoryTab("cellar")}>
              In Cellar ({cellarWines.length})
            </Button>
            <Button variant={inventoryTab === "drank" ? "default" : "outline"} onClick={() => setInventoryTab("drank")}>
              Drank ({drankWines.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {inventoryTab === "cellar"
              ? "Active cellar bottles stay in inventory totals, value, readiness windows, producer summaries, and storage counts."
              : "Drank bottles are archived here. Their data stays visible, but they are read-only and excluded from all active inventory calculations."}
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={kpiLabels.bottles}
          value={String(totalBottles)}
          trend={`${analyticsWines.length} ${inventoryTab === "cellar" ? "active" : "drank"} wine entries in view`}
        />
        <KpiCard
          label={kpiLabels.value}
          value={formatCurrency(currentValue)}
          trend={inventoryTab === "cellar" ? "Estimated current cellar value" : "Estimated value of visible drank bottles"}
          tone="success"
        />
        <KpiCard label={kpiLabels.score} value={averageScore.toFixed(2)} trend={averageScoreLabel} tone="warning" />
        <KpiCard
          label={kpiLabels.readiness}
          value={String(readyCount)}
          trend={inventoryTab === "cellar" ? "Bottles suitable for near-term service" : "Drank bottles previously marked ready or peak"}
          tone="danger"
        />
      </section>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardDescription>Filters and actions</CardDescription>
            <CardTitle>Find bottles fast or add a new one</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {statusMessage ? (
            <div className="md:col-span-2 rounded-2xl border border-border/80 bg-secondary/40 px-4 py-3 text-sm text-foreground">
              {statusMessage}
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium">Location</p>
            <NativeSelect value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
              <option value="all">All locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Readiness</p>
            <NativeSelect value={readinessFilter} onChange={(event) => setReadinessFilter(event.target.value as "all" | WineBottle["readiness"])}>
              <option value="all">All windows</option>
              {readinessOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" side="right">
          <DialogHeader>
            <DialogTitle>{editingWine ? "Edit Wine" : "Add Wine"}</DialogTitle>
            <DialogDescription>Save bottle details, shelf placement, pricing, and optional external scoring links.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Wine name" value={form.wineName} onChange={(event) => updateForm("wineName", event.target.value)} />
              <Input placeholder="Producer" value={form.producer} onChange={(event) => updateForm("producer", event.target.value)} />
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Bottle image</p>
                <input
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary/80"
                  type="file"
                  accept="image/*"
                  onChange={(event) => void updateWineImage(event.target.files?.[0] ?? null)}
                />
              </div>
              {form.imageUrl ? (
                <div className="flex items-start gap-4 rounded-2xl border border-border/80 bg-secondary/40 p-3">
                  <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl">
                    <NextImage
                      src={form.imageUrl}
                      alt="Bottle preview"
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <Button type="button" variant="ghost" onClick={() => updateForm("imageUrl", "")}>
                    Remove image
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Vintage" value={form.vintage} onChange={(event) => updateForm("vintage", event.target.value)} />
              <NativeSelect value={form.region} onChange={(event) => updateForm("region", event.target.value)}>
                <option value="">Select region</option>
                {regionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect value={form.country} onChange={(event) => updateForm("country", event.target.value)}>
                <option value="">Select country</option>
                {countryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <NativeSelect value={form.grape} onChange={(event) => updateForm("grape", event.target.value)}>
                <option value="">Select grape</option>
                {sortedGrapeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect value={form.style} onChange={(event) => updateForm("style", event.target.value)}>
                <option value="">Select style</option>
                {styleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
              <Input placeholder="Bottle size" value={form.bottleSize} onChange={(event) => updateForm("bottleSize", event.target.value)} />
            </div>
            <Input placeholder="Grape Varieties" value={form.grapeVarieties} onChange={(event) => updateForm("grapeVarieties", event.target.value)} />
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Quantity" value={form.quantity} onChange={(event) => updateForm("quantity", event.target.value)} />
              <Input placeholder="Buy price" value={form.purchasePrice} onChange={(event) => updateForm("purchasePrice", event.target.value)} />
              <Input placeholder="Estimated value" value={form.estimatedValue} onChange={(event) => updateForm("estimatedValue", event.target.value)} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Vivino link" value={form.vivinoLink} onChange={(event) => updateForm("vivinoLink", event.target.value)} />
              <Input placeholder="Vivino score" value={form.vivinoScore} onChange={(event) => updateForm("vivinoScore", event.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              You can manually override the Vivino score. If you do, the inventory card will mark that Vivino score as manual and preserve it.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium">Manual critic override</p>
              <p className="text-xs text-muted-foreground">
                Fill Robert Parker or James Suckling here when automatic refresh fails. Manual critic scores are preserved and not overwritten on save.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Robert Parker score"
                value={form.robertParkerScore}
                onChange={(event) => updateForm("robertParkerScore", event.target.value)}
              />
              <Input
                placeholder="James Suckling score"
                value={form.jamesSucklingScore}
                onChange={(event) => updateForm("jamesSucklingScore", event.target.value)}
              />
              <Input placeholder="Critic source" value={form.criticSource} onChange={(event) => updateForm("criticSource", event.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Online scoring is critic-first. Robert Parker and James Suckling are prioritized from configured sources and Wine-Searcher parsing. Vivino remains an optional link and best-effort community score.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <NativeSelect value={form.locationId} onChange={(event) => updateForm("locationId", event.target.value)}>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </NativeSelect>
              <Input placeholder="Merchant / source" value={form.supplierId} onChange={(event) => updateForm("supplierId", event.target.value)} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Shelf" value={form.shelf} onChange={(event) => updateForm("shelf", event.target.value)} />
              <Input placeholder="Slot" value={form.slot} onChange={(event) => updateForm("slot", event.target.value)} />
              <NativeSelect value={form.readiness} onChange={(event) => updateForm("readiness", event.target.value)}>
                {readinessOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Drink window" value={form.drinkWindow} onChange={(event) => updateForm("drinkWindow", event.target.value)} />
              <Input type="date" value={form.acquiredOn} onChange={(event) => updateForm("acquiredOn", event.target.value)} />
            </div>
            <Textarea placeholder="Notes" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} />
            {visibleError ? <p className="text-sm text-rose-500">{visibleError}</p> : null}
            <Button onClick={submitWine} disabled={isPending}>
              {editingWine ? "Save Changes" : "Create Wine"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Wine</DialogTitle>
            <DialogDescription>Read-only bottle details from your inventory.</DialogDescription>
          </DialogHeader>
          {viewingWine ? (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                {viewingWine.imageUrl ? (
                  <div className="relative h-24 w-20 overflow-hidden rounded-2xl border border-border/70 bg-secondary/40">
                    <NextImage
                      src={viewingWine.imageUrl}
                      alt={getWineDisplayTitle(viewingWine)}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : null}
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{getWineDisplayTitle(viewingWine)}</h3>
                  <p className="text-sm text-muted-foreground">{viewingWine.producer}</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingWine.vivinoScore > 0 ? <Badge variant="info">{viewingWine.vivinoScore.toFixed(1)} Vivino</Badge> : null}
                    {viewingWine.vivinoScore > 0 && viewingWine.vivinoScoreSource === "Manual" ? <Badge variant="warning">Manual</Badge> : null}
                    {viewingWine.robertParkerScore > 0 ? <Badge variant="warning">RP {viewingWine.robertParkerScore}</Badge> : null}
                    {viewingWine.jamesSucklingScore > 0 ? <Badge variant="warning">JS {viewingWine.jamesSucklingScore}</Badge> : null}
                    {isCellarWine(viewingWine) ? (
                      <Badge variant={getReadinessVariant(viewingWine.readiness)}>{viewingWine.readiness}</Badge>
                    ) : (
                      <Badge variant="info">Drank</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Region</p>
                  <p className="mt-1 font-medium">{viewingWine.region || "—"}</p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="mt-1 font-medium">{viewingWine.country || "—"}</p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Vintage</p>
                  <p className="mt-1 font-medium">{viewingWine.vintage || "—"}</p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="mt-1 font-medium">{viewingWine.quantity}</p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Grape</p>
                  <p className="mt-1 font-medium">{viewingWine.grape || "—"}</p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Grape Varieties</p>
                  <p className="mt-1 font-medium">{viewingWine.grapeVarieties || "—"}</p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Estimated Value</p>
                  <p className="mt-1 font-medium">{formatCurrency(viewingWine.estimatedValue)}</p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Placement</p>
                  <p className="mt-1 font-medium">{formatWinePlacement(viewingWine.shelf, viewingWine.slot) || "—"}</p>
                </div>
              </div>

              {viewingWine.notes ? (
                <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap font-medium">{viewingWine.notes}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={scanDialogOpen}
        onOpenChange={(open) => {
          setScanDialogOpen(open);

          if (!open) {
            resetScanAssist();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Assist</DialogTitle>
            <DialogDescription>
              Capture or upload a bottle image, then open a draft with the photo attached for manual review and completion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Bottle image</p>
              <div className="flex flex-wrap gap-3">
                <input
                  ref={uploadScanInputRef}
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) => void updateScanImage(event.target.files?.[0] ?? null)}
                />
                <input
                  ref={captureScanInputRef}
                  className="hidden"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => void updateScanImage(event.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" onClick={() => uploadScanInputRef.current?.click()}>
                  Upload image
                </Button>
                <Button type="button" variant="outline" onClick={() => captureScanInputRef.current?.click()}>
                  Capture
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Capture opens the phone camera on supported mobile browsers and attaches the bottle photo to a draft.
              </p>
            </div>
            {scanImageUrl ? (
              <div className="relative h-40 w-28 overflow-hidden rounded-xl">
                <NextImage
                  src={scanImageUrl}
                  alt="Scanned bottle preview"
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : null}
            <Textarea
              placeholder="Optional notes from the bottle label"
              value={scanText}
              onChange={(event) => setScanText(event.target.value)}
            />
            {scanOcrStatus ? <p className="text-sm text-muted-foreground">{scanOcrStatus}</p> : null}
            {scanError ? <p className="text-sm text-rose-500">{scanError}</p> : null}
            <Button onClick={generateDraftFromScan} disabled={isPending}>
              Generate Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {visibleWines.map((wine) => {
          const location = locations.find((item) => item.id === wine.locationId);
          const headerMeta = [wine.vintage ? String(wine.vintage) : "", wine.region, wine.country].filter(Boolean).join(" • ");
          const placement = formatWinePlacement(wine.shelf, wine.slot);

          return (
            <Card
              key={wine.id}
              style={{
                contentVisibility: "auto",
                containIntrinsicSize: "520px"
              }}
            >
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardDescription>{headerMeta}</CardDescription>
                  <CardTitle>{getWineDisplayTitle(wine)}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {isCellarWine(wine) ? <Badge variant={getReadinessVariant(wine.readiness)}>{wine.readiness}</Badge> : <Badge variant="info">Drank</Badge>}
                  {wine.vivinoScore > 0 ? <Badge variant="info">{wine.vivinoScore.toFixed(1)} Vivino</Badge> : null}
                  {wine.vivinoScore > 0 && wine.vivinoScoreSource === "Manual" ? <Badge variant="warning">Manual</Badge> : null}
                  {wine.robertParkerScore > 0 ? <Badge variant="warning">RP {wine.robertParkerScore}</Badge> : null}
                  {wine.jamesSucklingScore > 0 ? <Badge variant="warning">JS {wine.jamesSucklingScore}</Badge> : null}
                  {wine.criticSource ? <Badge variant="success">{wine.criticSource}</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {wine.imageUrl ? (
                  <div className="flex justify-start">
                    <div className="relative h-48 w-32 shrink-0 overflow-hidden rounded-2xl shadow-sm">
                      <NextImage
                        src={wine.imageUrl}
                        alt={getWineDisplayTitle(wine)}
                        fill
                        sizes="(max-width: 768px) 128px, 128px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-3xl bg-secondary/60 p-4 text-sm">
                    <p className="text-muted-foreground">Location</p>
                    <p className="mt-1 font-medium text-foreground">{location?.name ?? "Unknown"}</p>
                    <p className="text-muted-foreground">{placement || "Shelf and slot not set"}</p>
                  </div>
                  <div className="rounded-3xl bg-secondary/60 p-4 text-sm">
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="mt-1 font-medium text-foreground">{wine.quantity}</p>
                    <p className="text-muted-foreground">{wine.bottleSize}</p>
                  </div>
                  <div className="rounded-3xl bg-secondary/60 p-4 text-sm">
                    <p className="text-muted-foreground">Pricing</p>
                    <p className="mt-1 font-medium text-foreground">{formatCurrency(wine.purchasePrice)}</p>
                    <p className="text-muted-foreground">Value {formatCurrency(wine.estimatedValue)}</p>
                  </div>
                  <div className="rounded-3xl bg-secondary/60 p-4 text-sm">
                    <p className="text-muted-foreground">Grape Varieties</p>
                    <p className="mt-1 font-medium text-foreground">{wine.grapeVarieties || "Not available yet"}</p>
                    <p className="text-muted-foreground">{wine.cellarStatus === "Drank" && wine.drankOn ? `Drank on ${wine.drankOn}` : wine.drinkWindow}</p>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{wine.notes}</p>
                </div>
                {wineStatusById[wine.id] ? (
                  <div className="rounded-2xl border border-border/80 bg-secondary/40 px-4 py-3 text-sm text-foreground">
                    {wineStatusById[wine.id]}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" onClick={() => openViewDialog(wine)}>
                    <Eye className="h-4 w-4" />
                    View Wine
                  </Button>
                  {isCellarWine(wine) ? (
                    <Button variant="outline" onClick={() => openEditDialog(wine)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  ) : null}
                  {isCellarWine(wine) ? (
                    <Button variant="outline" onClick={() => markAsDrank(wine)} disabled={isPending}>
                      <Wine className="h-4 w-4" />
                      Drank
                    </Button>
                  ) : null}
                  {isCellarWine(wine) ? (
                    <Button variant="ghost" onClick={() => removeWine(wine)} disabled={isPending}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  ) : null}
                  {isCellarWine(wine) ? (
                    <Button variant="outline" onClick={() => refreshVivino(wine)} disabled={isPending}>
                      <RefreshCw className="h-4 w-4" />
                      Refresh Scores
                    </Button>
                  ) : null}
                  {wine.vivinoLink ? (
                    <Button asChild variant="outline">
                      <a href={wine.vivinoLink} target="_blank" rel="noreferrer">
                        Open Vivino
                      </a>
                    </Button>
                  ) : null}
                  {!isCellarWine(wine) ? <Badge variant="info">Read only</Badge> : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {visibleWines.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {inventoryTab === "cellar"
                ? "No active bottles match the current filters."
                : "No drank bottles match the current filters."}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
