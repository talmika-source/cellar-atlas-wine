import { NextResponse } from "next/server";

import { backupStoreConfigured, createDatabaseBackup, listDatabaseBackups } from "@/lib/backup-store";
import { requireEditorSession } from "@/lib/editor-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const backups = await listDatabaseBackups(20);

    return NextResponse.json({
      ok: true,
      configured: backupStoreConfigured(),
      data: backups
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to load backups."
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  const authError = requireEditorSession();

  if (authError) {
    return authError;
  }

  try {
    const backup = await createDatabaseBackup("manual");

    return NextResponse.json({
      ok: true,
      data: {
        pathname: backup.pathname,
        uploadedAt: backup.uploadedAt,
        size: backup.size,
        downloadUrl: backup.downloadUrl,
        url: backup.url
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to create a backup."
      },
      { status: 500 }
    );
  }
}
