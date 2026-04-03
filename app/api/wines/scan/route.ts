import { NextResponse } from "next/server";

import { getDefaultLocationId } from "@/lib/locations-store";
import { enrichWineWithExternalScores, generateWineDraftFromScan, type WineInput } from "@/lib/wine-store";

async function generateImageOnlyDraft(imageUrl: string) {
  const locationId = await getDefaultLocationId();

  const draft: WineInput = {
    wineName: "",
    producer: "",
    imageUrl,
    vintage: null,
    region: "",
    country: "",
    grape: "",
    grapeVarieties: "",
    style: "",
    bottleSize: "750ml",
    quantity: 1,
    purchasePrice: 0,
    estimatedValue: 0,
    vivinoLink: "",
    vivinoScore: 0,
    vivinoScoreSource: "",
    robertParkerScore: 0,
    jamesSucklingScore: 0,
    criticSource: "",
    locationId,
    shelf: "",
    slot: "",
    readiness: "Ready",
    drinkWindow: "",
    acquiredOn: new Date().toISOString().slice(0, 10),
    supplierId: "",
    notes: "Draft created from captured bottle image.",
    cellarStatus: "Cellar",
    drankOn: ""
  };

  return draft;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { rawText?: string; imageUrl?: string };
  const rawText = body.rawText?.trim() ?? "";
  const imageUrl = body.imageUrl?.trim() ?? "";

  if (!rawText && !imageUrl) {
    return NextResponse.json({ error: "Capture or upload a bottle image first." }, { status: 400 });
  }

  const draft = rawText
    ? {
        ...(await generateWineDraftFromScan(rawText)),
        imageUrl
      }
    : await generateImageOnlyDraft(imageUrl);
  const enriched = await enrichWineWithExternalScores(draft, { deepCriticLookup: true });

  return NextResponse.json({ data: enriched, extractedText: rawText });
}
