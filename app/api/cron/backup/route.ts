import { NextRequest, NextResponse } from "next/server";

import { createDatabaseBackup } from "@/lib/backup-store";

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  try {
    const backup = await createDatabaseBackup("cron");

    return NextResponse.json({
      ok: true,
      data: {
        pathname: backup.pathname,
        uploadedAt: backup.uploadedAt,
        size: backup.size
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to create scheduled backup."
      },
      { status: 500 }
    );
  }
}
