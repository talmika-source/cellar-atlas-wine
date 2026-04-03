import { NextResponse } from "next/server";

import { requireEditorSession } from "@/lib/editor-auth";
import { enrichWineWithExternalScores, ExternalScoringUnavailableError, getWine, updateWine } from "@/lib/wine-store";
import { type EnrichmentDebugEntry } from "@/lib/critic-sources";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const authError = requireEditorSession();

  if (authError) {
    return authError;
  }

  try {
    const currentWine = await getWine(params.id);

    if (!currentWine) {
      return NextResponse.json({ error: "Wine not found" }, { status: 404 });
    }

    const debug: EnrichmentDebugEntry[] = [];
    const enrichedWine = await enrichWineWithExternalScores({
      wineName: currentWine.wineName,
      producer: currentWine.producer,
      imageUrl: currentWine.imageUrl,
      vintage: currentWine.vintage,
      region: currentWine.region,
      country: currentWine.country,
      grape: currentWine.grape,
      grapeVarieties: currentWine.grapeVarieties,
      style: currentWine.style,
      bottleSize: currentWine.bottleSize,
      quantity: currentWine.quantity,
      purchasePrice: currentWine.purchasePrice,
      estimatedValue: currentWine.estimatedValue,
      vivinoLink: currentWine.vivinoLink,
      vivinoScore: currentWine.vivinoScore,
      vivinoScoreSource: currentWine.vivinoScoreSource,
      robertParkerScore: currentWine.robertParkerScore,
      jamesSucklingScore: currentWine.jamesSucklingScore,
      criticSource: currentWine.criticSource,
      locationId: currentWine.locationId,
      shelf: currentWine.shelf,
      slot: currentWine.slot,
      readiness: currentWine.readiness,
      drinkWindow: currentWine.drinkWindow,
      acquiredOn: currentWine.acquiredOn,
      supplierId: currentWine.supplierId,
      notes: currentWine.notes,
      cellarStatus: currentWine.cellarStatus ?? "Cellar",
      drankOn: currentWine.drankOn ?? ""
    }, { deepCriticLookup: true, debugEntries: debug });

    const wine = await updateWine(params.id, enrichedWine);

    if (!wine) {
      return NextResponse.json({ error: "Wine not found" }, { status: 404 });
    }

    return NextResponse.json({ data: wine, debug });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ExternalScoringUnavailableError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Unable to refresh external scores."
      },
      { status: 503 }
    );
  }
}
