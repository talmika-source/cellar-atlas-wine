import { type WineBottle } from "@/lib/wine-data";

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

export function getCriticAverageScore(wine: Pick<WineBottle, "robertParkerScore" | "jamesSucklingScore">) {
  const values = [wine.robertParkerScore, wine.jamesSucklingScore].filter((value) => value > 0);

  if (values.length === 0) {
    return null;
  }

  return roundToTenth(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function getVivinoPortfolioScore(wine: Pick<WineBottle, "vivinoScore">) {
  return wine.vivinoScore > 0 ? roundToTenth(wine.vivinoScore) : null;
}

export function getPrimaryCellarScore(wine: Pick<WineBottle, "vivinoScore" | "robertParkerScore" | "jamesSucklingScore">) {
  const criticAverage = getCriticAverageScore(wine);

  if (criticAverage !== null) {
    return criticAverage;
  }

  return wine.vivinoScore > 0 ? roundToTenth(wine.vivinoScore) : null;
}

export function getPrimaryCellarScoreLabel(wine: Pick<WineBottle, "vivinoScore" | "robertParkerScore" | "jamesSucklingScore">) {
  const hasCritic = wine.robertParkerScore > 0 || wine.jamesSucklingScore > 0;

  if (hasCritic) {
    return "Critics";
  }

  if (wine.vivinoScore > 0) {
    return "Vivino";
  }

  return "Unscored";
}
