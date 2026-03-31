import { NextResponse } from "next/server";

import { enrichWineWithExternalScores, generateWineDraftFromScan } from "@/lib/wine-store";

export async function POST(request: Request) {
  const body = (await request.json()) as { rawText?: string; imageUrl?: string };

  if (!body.rawText?.trim()) {
    return NextResponse.json({ error: "rawText is required" }, { status: 400 });
  }

  const draft = {
    ...(await generateWineDraftFromScan(body.rawText)),
    imageUrl: body.imageUrl ?? ""
  };
  const enriched = await enrichWineWithExternalScores(draft);

  return NextResponse.json({ data: enriched });
}
