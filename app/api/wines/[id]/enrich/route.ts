import { NextResponse } from "next/server";

import { enrichWineWithExternalScores, ExternalScoringUnavailableError, getWine, updateWine } from "@/lib/wine-store";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const currentWine = await getWine(params.id);

    if (!currentWine) {
      return NextResponse.json({ error: "Wine not found" }, { status: 404 });
    }

    const enrichedWine = await enrichWineWithExternalScores({
      wineName: currentWine.wineName,
      producer: currentWine.producer,
      imageUrl: currentWine.imageUrl,
      vintage: currentWine.vintage,
      region: currentWine.region,
      country: currentWine.country,
      grape: currentWine.grape,
      style: currentWine.style,
      bottleSize: currentWine.bottleSize,
      quantity: currentWine.quantity,
      purchasePrice: currentWine.purchasePrice,
      estimatedValue: currentWine.estimatedValue,
      vivinoLink: currentWine.vivinoLink,
      vivinoScore: currentWine.vivinoScore,
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
    }, { deepCriticLookup: true });

    const wine = await updateWine(params.id, enrichedWine);

    if (!wine) {
      return NextResponse.json({ error: "Wine not found" }, { status: 404 });
    }

    return NextResponse.json({ data: wine });
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
