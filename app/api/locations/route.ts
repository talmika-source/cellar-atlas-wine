import { NextResponse } from "next/server";

import { createLocation, listLocations, type LocationInput } from "@/lib/locations-store";
import { type ValidatedLocationInput, validateLocationInput } from "@/lib/wine-validation";

export async function GET() {
  return NextResponse.json({ data: await listLocations() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<LocationInput>;
  const validated = validateLocationInput(body);

  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const location = await createLocation(validated.data as ValidatedLocationInput);

  return NextResponse.json({ data: location }, { status: 201 });
}
