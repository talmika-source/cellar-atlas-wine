import { NextResponse } from "next/server";

import { requireEditorSession } from "@/lib/editor-auth";
import { createLocation, listLocations, type LocationInput } from "@/lib/locations-store";
import { type ValidatedLocationInput, validateLocationInput } from "@/lib/wine-validation";

export async function GET() {
  try {
    return NextResponse.json({ data: await listLocations() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load locations." },
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
    const body = (await request.json()) as Partial<LocationInput>;
    const validated = validateLocationInput(body);

    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const location = await createLocation(validated.data as ValidatedLocationInput);

    return NextResponse.json({ data: location }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create location." },
      { status: 500 }
    );
  }
}
