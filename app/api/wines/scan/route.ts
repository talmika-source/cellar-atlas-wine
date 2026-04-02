import { NextResponse } from "next/server";

import { extractTextFromImageDataUrl } from "@/lib/ocr";
import { enrichWineWithExternalScores, generateWineDraftFromScan } from "@/lib/wine-store";

export async function POST(request: Request) {
  const body = (await request.json()) as { rawText?: string; imageUrl?: string };
  const rawText = body.rawText?.trim() ?? "";
  const imageUrl = body.imageUrl?.trim() ?? "";
  const ocrText = !rawText && imageUrl ? await extractTextFromImageDataUrl(imageUrl) : "";
  const scanText = rawText || ocrText;

  if (!scanText) {
    return NextResponse.json({ error: "Provide OCR text or capture/upload a bottle image." }, { status: 400 });
  }

  const draft = {
    ...(await generateWineDraftFromScan(scanText)),
    imageUrl
  };
  const enriched = await enrichWineWithExternalScores(draft, { deepCriticLookup: true });

  return NextResponse.json({ data: enriched, extractedText: scanText });
}
