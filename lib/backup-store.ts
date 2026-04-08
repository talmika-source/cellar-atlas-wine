import { StorageLocationType, WineCellarStatus, WineReadiness, type WineEntry, type WineLocation } from "@prisma/client";
import { get, list, put } from "@vercel/blob";

import { prisma } from "@/lib/db/prisma";

const BACKUP_PREFIX = "cellar-backups";

type BackupLocationRecord = {
  id: string;
  name: string;
  type: StorageLocationType;
  room: string | null;
  capacity: number;
  temperatureC: number;
  humidity: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type BackupWineRecord = {
  id: string;
  wineName: string;
  producer: string;
  imageUrl: string | null;
  vintage: number | null;
  region: string | null;
  country: string | null;
  grape: string | null;
  grapeVarieties: string | null;
  style: string | null;
  bottleSize: string;
  quantity: number;
  purchasePrice: number;
  estimatedValue: number;
  vivinoLink: string | null;
  vivinoScore: number;
  vivinoScoreSource: string | null;
  robertParkerScore: number;
  jamesSucklingScore: number;
  criticSource: string | null;
  locationId: string;
  shelf: string | null;
  slot: string | null;
  readiness: WineReadiness;
  drinkWindow: string | null;
  acquiredOn: string | null;
  supplierId: string | null;
  notes: string | null;
  cellarStatus: WineCellarStatus;
  drankOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  source: "database";
  trigger: "manual" | "cron";
  inventory: {
    wineRecords: number;
    locationRecords: number;
    totalBottles: number;
  };
  locations: BackupLocationRecord[];
  wines: BackupWineRecord[];
};

export type BackupSummary = {
  pathname: string;
  uploadedAt: string;
  size: number;
  downloadUrl: string;
  url: string;
};

function ensureBlobConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }
}

function serializeLocation(record: WineLocation): BackupLocationRecord {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    room: record.room,
    capacity: record.capacity,
    temperatureC: record.temperatureC,
    humidity: record.humidity,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function serializeWine(record: WineEntry): BackupWineRecord {
  return {
    id: record.id,
    wineName: record.wineName,
    producer: record.producer,
    imageUrl: record.imageUrl,
    vintage: record.vintage,
    region: record.region,
    country: record.country,
    grape: record.grape,
    grapeVarieties: record.grapeVarieties,
    style: record.style,
    bottleSize: record.bottleSize,
    quantity: record.quantity,
    purchasePrice: record.purchasePrice,
    estimatedValue: record.estimatedValue,
    vivinoLink: record.vivinoLink,
    vivinoScore: record.vivinoScore,
    vivinoScoreSource: record.vivinoScoreSource,
    robertParkerScore: record.robertParkerScore,
    jamesSucklingScore: record.jamesSucklingScore,
    criticSource: record.criticSource,
    locationId: record.locationId,
    shelf: record.shelf,
    slot: record.slot,
    readiness: record.readiness,
    drinkWindow: record.drinkWindow,
    acquiredOn: record.acquiredOn?.toISOString() ?? null,
    supplierId: record.supplierId,
    notes: record.notes,
    cellarStatus: record.cellarStatus,
    drankOn: record.drankOn?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function buildBackupPath(exportedAt: string) {
  return `${BACKUP_PREFIX}/${exportedAt.replace(/[:.]/g, "-")}.json`;
}

export function backupStoreConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export async function createDatabaseBackup(trigger: "manual" | "cron") {
  ensureBlobConfigured();

  const [locations, wines] = await Promise.all([
    prisma.wineLocation.findMany({ orderBy: [{ createdAt: "asc" }] }),
    prisma.wineEntry.findMany({ orderBy: [{ createdAt: "asc" }] })
  ]);

  const exportedAt = new Date().toISOString();
  const payload: BackupPayload = {
    version: 1,
    exportedAt,
    source: "database",
    trigger,
    inventory: {
      wineRecords: wines.length,
      locationRecords: locations.length,
      totalBottles: wines.reduce((sum, wine) => sum + wine.quantity, 0)
    },
    locations: locations.map(serializeLocation),
    wines: wines.map(serializeWine)
  };
  const serializedPayload = JSON.stringify(payload, null, 2);

  const pathname = buildBackupPath(exportedAt);
  const blob = await put(pathname, serializedPayload, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json"
  });

  return {
    pathname: blob.pathname,
    uploadedAt: exportedAt,
    size: Buffer.byteLength(serializedPayload, "utf8"),
    downloadUrl: blob.downloadUrl,
    url: blob.url,
    payload
  };
}

export async function listDatabaseBackups(limit = 10): Promise<BackupSummary[]> {
  if (!backupStoreConfigured()) {
    return [];
  }

  const result = await list({
    prefix: `${BACKUP_PREFIX}/`,
    limit: Math.max(limit, 1),
    mode: "expanded"
  });

  return result.blobs
    .map((blob) => ({
      pathname: blob.pathname,
      uploadedAt: blob.uploadedAt.toISOString(),
      size: blob.size,
      downloadUrl: blob.downloadUrl,
      url: blob.url
    }))
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .slice(0, limit);
}

export async function getBackupPayload(pathname: string) {
  ensureBlobConfigured();

  const blob = await get(pathname, { access: "private", useCache: false });

  if (!blob || blob.statusCode !== 200) {
    throw new Error("Backup file not found.");
  }

  const text = await new Response(blob.stream).text();
  return {
    payload: JSON.parse(text) as BackupPayload,
    blob: {
      pathname: blob.blob.pathname,
      downloadUrl: blob.blob.downloadUrl,
      url: blob.blob.url,
      uploadedAt: blob.blob.uploadedAt.toISOString(),
      contentType: blob.blob.contentType ?? "application/json"
    }
  };
}

export async function restoreDatabaseBackup(pathname: string) {
  const { payload } = await getBackupPayload(pathname);

  await prisma.$transaction(async (tx) => {
    await tx.wineEntry.deleteMany();
    await tx.wineLocation.deleteMany();

    if (payload.locations.length > 0) {
      await tx.wineLocation.createMany({
        data: payload.locations.map((location) => ({
          id: location.id,
          name: location.name,
          type: location.type,
          room: location.room,
          capacity: location.capacity,
          temperatureC: location.temperatureC,
          humidity: location.humidity,
          notes: location.notes,
          createdAt: new Date(location.createdAt),
          updatedAt: new Date(location.updatedAt)
        }))
      });
    }

    if (payload.wines.length > 0) {
      await tx.wineEntry.createMany({
        data: payload.wines.map((wine) => ({
          id: wine.id,
          wineName: wine.wineName,
          producer: wine.producer,
          imageUrl: wine.imageUrl,
          vintage: wine.vintage,
          region: wine.region,
          country: wine.country,
          grape: wine.grape,
          grapeVarieties: wine.grapeVarieties,
          style: wine.style,
          bottleSize: wine.bottleSize,
          quantity: wine.quantity,
          purchasePrice: wine.purchasePrice,
          estimatedValue: wine.estimatedValue,
          vivinoLink: wine.vivinoLink,
          vivinoScore: wine.vivinoScore,
          vivinoScoreSource: wine.vivinoScoreSource,
          robertParkerScore: wine.robertParkerScore,
          jamesSucklingScore: wine.jamesSucklingScore,
          criticSource: wine.criticSource,
          locationId: wine.locationId,
          shelf: wine.shelf,
          slot: wine.slot,
          readiness: wine.readiness,
          drinkWindow: wine.drinkWindow,
          acquiredOn: wine.acquiredOn ? new Date(wine.acquiredOn) : null,
          supplierId: wine.supplierId,
          notes: wine.notes,
          cellarStatus: wine.cellarStatus,
          drankOn: wine.drankOn ? new Date(wine.drankOn) : null,
          createdAt: new Date(wine.createdAt),
          updatedAt: new Date(wine.updatedAt)
        }))
      });
    }
  });

  return payload;
}
