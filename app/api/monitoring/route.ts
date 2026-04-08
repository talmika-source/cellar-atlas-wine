import { WineCellarStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { backupStoreConfigured, listDatabaseBackups } from "@/lib/backup-store";
import { prisma } from "@/lib/db/prisma";
import { readStoredLocations, readStoredWines } from "@/lib/wine-file-store";

type MonitoringAlert = {
  severity: "info" | "warning" | "error";
  title: string;
  detail: string;
};

function inferDatabaseGuidance(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("monthly free plan limit") || normalized.includes("network transfer allowance")) {
    return "Neon may be paused because the project hit its monthly free-plan transfer limit. Resume or upgrade the Neon project to restore data access.";
  }

  if (normalized.includes("can't reach database server") || normalized.includes("timed out")) {
    return "The database is configured but unreachable. Check the Neon project status, branch, and network availability.";
  }

  if (normalized.includes("authentication failed")) {
    return "The database credentials appear invalid. Recheck the Production DATABASE_URL in Vercel.";
  }

  return "The database is configured but the app could not read it. Check Neon project status and the Production DATABASE_URL.";
}

export async function GET() {
  const checkedAt = new Date().toISOString();
  const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());
  const [storedWines, storedLocations] = await Promise.all([readStoredWines(), readStoredLocations()]);
  const fallback = {
    fileWineRecords: storedWines.length,
    fileLocationRecords: storedLocations.length,
    active: !databaseConfigured
  };
  const backupsEnabled = backupStoreConfigured();
  const backups = backupsEnabled ? await listDatabaseBackups(10).catch(() => []) : [];

  const alerts: MonitoringAlert[] = [];

  if (!databaseConfigured) {
    alerts.push({
      severity: "warning",
      title: "Database not configured",
      detail: "The app is running in local JSON mode. Production inventory persistence and recovery signals are limited."
    });

    const totalBottles = storedWines.reduce((sum, wine) => sum + wine.quantity, 0);
    const drankBottles = storedWines
      .filter((wine) => wine.cellarStatus === "Drank")
      .reduce((sum, wine) => sum + wine.quantity, 0);

    return NextResponse.json({
      ok: true,
      checkedAt,
      database: {
        configured: false,
        reachable: false,
        mode: "file-fallback",
        provider: "local-json",
        guidance: "Add a Production DATABASE_URL to use the main PostgreSQL inventory."
      },
      inventory: {
        wineRecords: storedWines.length,
        totalBottles,
        cellarBottles: totalBottles - drankBottles,
        drankBottles,
        locations: storedLocations.length,
        withImages: storedWines.filter((wine) => Boolean(wine.imageUrl)).length,
        withVivinoScores: storedWines.filter((wine) => wine.vivinoScore > 0).length,
        manualVivinoOverrides: storedWines.filter((wine) => wine.vivinoScoreSource === "Manual").length
      },
      fallback,
      backups: {
        configured: backupsEnabled,
        latest: backups[0] ?? null,
        recent: backups
      },
      alerts
    });
  }

  try {
    const [
      wineRecords,
      totalWineQuantity,
      drankWineQuantity,
      locationCount,
      withImages,
      withVivinoScores,
      manualVivinoOverrides
    ] = await Promise.all([
      prisma.wineEntry.count(),
      prisma.wineEntry.aggregate({ _sum: { quantity: true } }),
      prisma.wineEntry.aggregate({
        where: { cellarStatus: WineCellarStatus.DRANK },
        _sum: { quantity: true }
      }),
      prisma.wineLocation.count(),
      prisma.wineEntry.count({ where: { imageUrl: { not: null } } }),
      prisma.wineEntry.count({ where: { vivinoScore: { gt: 0 } } }),
      prisma.wineEntry.count({ where: { vivinoScoreSource: "Manual" } })
    ]);

    if (fallback.fileWineRecords > 0) {
      alerts.push({
        severity: "info",
        title: "Fallback dataset present",
        detail: `There are ${fallback.fileWineRecords} local JSON wine records on disk. They are not used while the database is healthy.`
      });
    }

    if (!backupsEnabled) {
      alerts.push({
        severity: "warning",
        title: "Automatic backups not configured",
        detail: "Connect Vercel Blob and add BLOB_READ_WRITE_TOKEN to enable scheduled backups and restore points."
      });
    } else if (backups.length === 0) {
      alerts.push({
        severity: "warning",
        title: "No backups found yet",
        detail: "Automatic backup storage is configured, but no snapshots are stored yet. Trigger a manual backup or wait for the nightly cron."
      });
    }

    return NextResponse.json({
      ok: true,
      checkedAt,
      database: {
        configured: true,
        reachable: true,
        mode: "database",
        provider: "postgresql",
        guidance: "The PostgreSQL inventory is reachable."
      },
      inventory: {
        wineRecords,
        totalBottles: totalWineQuantity._sum.quantity ?? 0,
        cellarBottles: (totalWineQuantity._sum.quantity ?? 0) - (drankWineQuantity._sum.quantity ?? 0),
        drankBottles: drankWineQuantity._sum.quantity ?? 0,
        locations: locationCount,
        withImages,
        withVivinoScores,
        manualVivinoOverrides
      },
      fallback,
      backups: {
        configured: backupsEnabled,
        latest: backups[0] ?? null,
        recent: backups
      },
      alerts
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    alerts.push({
      severity: "error",
      title: "Database unavailable",
      detail: inferDatabaseGuidance(message)
    });

    if (fallback.fileWineRecords > 0) {
      alerts.push({
        severity: "warning",
        title: "Fallback dataset differs",
        detail: `A local fallback file with ${fallback.fileWineRecords} wine records exists, which may be much smaller than your real PostgreSQL inventory.`
      });
    }

    return NextResponse.json(
      {
        ok: false,
        checkedAt,
        database: {
          configured: true,
          reachable: false,
          mode: "database",
          provider: "postgresql",
          error: message,
          guidance: inferDatabaseGuidance(message)
        },
        inventory: {
          wineRecords: 0,
          totalBottles: 0,
          cellarBottles: 0,
          drankBottles: 0,
          locations: 0,
          withImages: 0,
          withVivinoScores: 0,
          manualVivinoOverrides: 0
        },
        fallback,
        backups: {
          configured: backupsEnabled,
          latest: backups[0] ?? null,
          recent: backups
        },
        alerts
      },
      { status: 503 }
    );
  }
}
