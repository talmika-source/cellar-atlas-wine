import { NextResponse } from "next/server";

import { buildVivinoSearchUrl, createWine, enrichWineWithExternalScores, listWines, type WineInput } from "@/lib/wine-store";
import { getLocation } from "@/lib/locations-store";
import { type ValidatedWineInput, validateWineInput } from "@/lib/wine-validation";

export async function GET() {
  return NextResponse.json({ data: await listWines() });
}

export async function POST(request: Request) {
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

    const enrichedInput = await enrichWineWithExternalScores({
      ...validatedInput,
      vivinoLink: validatedInput.vivinoLink || buildVivinoSearchUrl(validatedInput)
    }, { deepCriticLookup: true });

    const wine = await createWine(enrichedInput);

    return NextResponse.json({ data: wine }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create wine." },
      { status: 500 }
    );
  }
}
