import { NextResponse } from "next/server";

import { buildVivinoSearchUrl, deleteWine, enrichWineWithExternalScores, getWine, updateWine, type WineInput } from "@/lib/wine-store";
import { inferReadinessFromVintage } from "@/lib/wine-readiness";
import { getLocation } from "@/lib/locations-store";
import { validateWineInput } from "@/lib/wine-validation";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const patch = (await request.json()) as Record<string, unknown>;
  const currentWine = await getWine(params.id);

  if (!currentWine) {
    return NextResponse.json({ error: "Wine not found" }, { status: 404 });
  }

  const validated = validateWineInput(patch, { partial: true });

  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const partialPatch = validated.data as Partial<WineInput>;

  if (partialPatch.locationId) {
    const location = await getLocation(partialPatch.locationId);

    if (!location) {
      return NextResponse.json({ error: "Selected location was not found." }, { status: 400 });
    }
  }

  const vivinoAwarePatch =
    partialPatch.wineName !== undefined ||
    partialPatch.producer !== undefined ||
    partialPatch.region !== undefined ||
    partialPatch.country !== undefined ||
    partialPatch.grape !== undefined ||
    partialPatch.vintage !== undefined ||
    partialPatch.vivinoLink !== undefined
      ? await enrichWineWithExternalScores({
          wineName: partialPatch.wineName ?? currentWine.wineName,
          producer: partialPatch.producer ?? currentWine.producer,
          imageUrl: partialPatch.imageUrl ?? currentWine.imageUrl,
          vintage: partialPatch.vintage ?? currentWine.vintage,
          region: partialPatch.region ?? currentWine.region,
          country: partialPatch.country ?? currentWine.country,
          grape: partialPatch.grape ?? currentWine.grape,
          style: partialPatch.style ?? currentWine.style,
          bottleSize: partialPatch.bottleSize ?? currentWine.bottleSize,
          quantity: partialPatch.quantity ?? currentWine.quantity,
          purchasePrice: partialPatch.purchasePrice ?? currentWine.purchasePrice,
          estimatedValue: partialPatch.estimatedValue ?? currentWine.estimatedValue,
          vivinoLink:
            partialPatch.vivinoLink !== undefined
              ? partialPatch.vivinoLink.trim()
              : currentWine.vivinoLink ||
                buildVivinoSearchUrl({
                  wineName: partialPatch.wineName ?? currentWine.wineName,
                  producer: partialPatch.producer ?? currentWine.producer,
                  vintage: partialPatch.vintage ?? currentWine.vintage,
                  region: partialPatch.region ?? currentWine.region,
                  country: partialPatch.country ?? currentWine.country,
                  grape: partialPatch.grape ?? currentWine.grape
                }),
          vivinoScore: partialPatch.vivinoScore ?? currentWine.vivinoScore,
          robertParkerScore: partialPatch.robertParkerScore ?? currentWine.robertParkerScore,
          jamesSucklingScore: partialPatch.jamesSucklingScore ?? currentWine.jamesSucklingScore,
          criticSource: partialPatch.criticSource ?? currentWine.criticSource,
          locationId: partialPatch.locationId ?? currentWine.locationId,
          shelf: partialPatch.shelf ?? currentWine.shelf,
          slot: partialPatch.slot ?? currentWine.slot,
          readiness:
            partialPatch.vintage !== undefined && partialPatch.vintage !== null
              ? inferReadinessFromVintage(partialPatch.vintage)
              : partialPatch.readiness ?? currentWine.readiness,
          drinkWindow: partialPatch.drinkWindow ?? currentWine.drinkWindow,
          acquiredOn: partialPatch.acquiredOn ?? currentWine.acquiredOn,
          supplierId: partialPatch.supplierId ?? currentWine.supplierId,
          notes: partialPatch.notes ?? currentWine.notes,
          cellarStatus: partialPatch.cellarStatus ?? currentWine.cellarStatus ?? "Cellar",
          drankOn: partialPatch.drankOn ?? currentWine.drankOn ?? ""
        } satisfies WineInput, { deepCriticLookup: false })
      : partialPatch;

  const wine = await updateWine(params.id, vivinoAwarePatch);

  if (!wine) {
    return NextResponse.json({ error: "Wine not found" }, { status: 404 });
  }

  return NextResponse.json({ data: wine });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const deleted = await deleteWine(params.id);

  if (!deleted) {
    return NextResponse.json({ error: "Wine not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
