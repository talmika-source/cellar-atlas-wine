import { type WineBottle } from "@/lib/wine-data";

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function cleanTrailingPunctuation(value: string) {
  return value.replace(/[\s,;:/-]+$/g, "").trim();
}

export function getWineDisplayName(wineName: string, vintage?: number | null) {
  const trimmedWineName = cleanTrailingPunctuation(wineName.trim());

  if (!trimmedWineName) {
    return vintage ? String(vintage) : "";
  }

  if (!vintage) {
    return trimmedWineName;
  }

  const vintagePattern = new RegExp(`(?:^|\\s)${vintage}(?:\\s|$)`, "g");
  const withoutVintage = trimmedWineName.replace(vintagePattern, " ").replace(/\s+/g, " ").trim();

  return withoutVintage || trimmedWineName;
}

export function getWineDisplayTitle(wine: Pick<WineBottle, "producer" | "wineName" | "vintage">) {
  const producer = cleanTrailingPunctuation(wine.producer.trim());
  const name = getWineDisplayName(wine.wineName, wine.vintage);
  const parts = [producer, name].filter(Boolean);

  return parts.join(" ").trim();
}

export function hasVintageInWineName(wineName: string, vintage?: number | null) {
  if (!vintage) {
    return false;
  }

  return new RegExp(`(?:^|\\s)${vintage}(?:\\s|$)`).test(normalizeText(wineName));
}
