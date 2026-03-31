import { NextResponse } from "next/server";

import { deleteLocation, getLocation, updateLocation, type LocationInput } from "@/lib/locations-store";
import { isCellarWine, type WineBottle } from "@/lib/wine-data";
import { listWines } from "@/lib/wine-store";
import { validateLocationInput } from "@/lib/wine-validation";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json()) as Partial<LocationInput>;
  const validated = validateLocationInput(body, { partial: true });

  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const updated = await updateLocation(params.id, validated.data);

  if (!updated) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const location = await getLocation(params.id);

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const winesInLocation = (await listWines()).some((wine: WineBottle) => wine.locationId === params.id && isCellarWine(wine));

  if (winesInLocation) {
    return NextResponse.json({ error: "Location still has wines assigned" }, { status: 400 });
  }

  await deleteLocation(params.id);
  return NextResponse.json({ ok: true });
}
