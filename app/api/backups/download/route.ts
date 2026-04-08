import { NextRequest, NextResponse } from "next/server";

import { getBackupPayload } from "@/lib/backup-store";
import { requireEditorSession } from "@/lib/editor-auth";

export async function GET(request: NextRequest) {
  const authError = requireEditorSession();

  if (authError) {
    return authError;
  }

  const pathname = request.nextUrl.searchParams.get("pathname")?.trim();

  if (!pathname) {
    return NextResponse.json({ error: "Backup pathname is required." }, { status: 400 });
  }

  try {
    const { payload } = await getBackupPayload(pathname);

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${pathname.split("/").pop() ?? "backup.json"}"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to download this backup."
      },
      { status: 500 }
    );
  }
}
