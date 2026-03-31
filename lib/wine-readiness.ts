import { type WineBottle } from "@/lib/wine-data";

export function inferReadinessFromVintage(vintage: number, referenceYear = new Date().getFullYear()): WineBottle["readiness"] {
  const age = Math.max(0, referenceYear - vintage);

  if (age <= 4) {
    return "Hold";
  }

  if (age <= 8) {
    return "Ready";
  }

  return "Peak";
}
