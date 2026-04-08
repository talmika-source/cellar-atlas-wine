import { NextRequest, NextResponse } from "next/server";

import { restoreDatabaseBackup } from "@/lib/backup-store";
import { requireEditorSession } from "@/lib/editor-auth";

export async function POST(request: NextRequest) {
  const authError = requireEditorSession();

  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => ({}))) as { pathname?: string; confirm?: string };
  const pathname = body.pathname?.trim();

  if (!pathname) {
    return NextResponse.json({ error: "Backup pathname is required." }, { status: 400 });
  }

  if (body.confirm !== "RESTORE") {
    return NextResponse.json(
      { error: 'Restore confirmation missing. Send confirm: "RESTORE" to continue.' },
      { status: 400 }
    );
  }

  try {
    const restored = await restoreDatabaseBackup(pathname);

    return NextResponse.json({
      ok: true,
      data: {
        pathname,
        restoredAt: new Date().toISOString(),
        wineRecords: restored.inventory.wineRecords,
        locationRecords: restored.inventory.locationRecords,
        totalBottles: restored.inventory.totalBottles
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to restore this backup."
      },
      { status: 500 }
    );
  }
}
