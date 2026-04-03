import { NextResponse } from "next/server";

import { requireEditorSession } from "@/lib/editor-auth";
import { buildVivinoSearchUrl, createWine, enrichWineWithExternalScores, listWines, type WineInput } from "@/lib/wine-store";
import { getLocation } from "@/lib/locations-store";
import { type ValidatedWineInput, validateWineInput } from "@/lib/wine-validation";

export async function GET() {
  try {
    return NextResponse.json({ data: await listWines() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load wines." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authError = requireEditorSession();

  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as Partial<WineInput>;
    const validated = validateWineInput(body);

    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const validatedInput = validated.data as ValidatedWineInput;
    const location = await getLocation(validatedInput.locationId);

    if (!location) {
      return NextResponse.json({ error: "Selected location was not found." }, { status: 400 });
    }

    const hasManualCriticScores = (validatedInput.robertParkerScore ?? 0) > 0 || (validatedInput.jamesSucklingScore ?? 0) > 0;
    const hasManualVivinoScore = (validatedInput.vivinoScore ?? 0) > 0;

    const baseInput = {
      ...validatedInput,
      vivinoLink: validatedInput.vivinoLink || buildVivinoSearchUrl(validatedInput),
      vivinoScoreSource:
        hasManualVivinoScore && !validatedInput.vivinoScoreSource.trim()
          ? "Manual"
          : validatedInput.vivinoScoreSource,
      criticSource:
        hasManualCriticScores && !validatedInput.criticSource.trim()
          ? "Manual"
          : validatedInput.criticSource
    };

    const enrichedInput = hasManualCriticScores || hasManualVivinoScore
      ? baseInput
      : await enrichWineWithExternalScores(baseInput, { deepCriticLookup: false });

    const wine = await createWine(enrichedInput);

    return NextResponse.json({ data: wine }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create wine." },
      { status: 500 }
    );
  }
}
