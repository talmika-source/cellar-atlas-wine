import { StorageLocationType, WineCellarStatus, WineReadiness, type WineEntry, type WineLocation } from "@prisma/client";

import { type StorageLocation, type WineBottle } from "@/lib/wine-data";

export function mapLocationTypeToDb(type: StorageLocation["type"]) {
  switch (type) {
    case "Cellar":
      return StorageLocationType.CELLAR;
    case "Cabinet":
      return StorageLocationType.CABINET;
    case "Locker":
      return StorageLocationType.LOCKER;
    default:
      return StorageLocationType.FRIDGE;
  }
}

export function mapLocationTypeFromDb(type: StorageLocationType): StorageLocation["type"] {
  switch (type) {
    case StorageLocationType.CELLAR:
      return "Cellar";
    case StorageLocationType.CABINET:
      return "Cabinet";
    case StorageLocationType.LOCKER:
      return "Locker";
    default:
      return "Fridge";
  }
}

export function mapReadinessToDb(readiness: WineBottle["readiness"]) {
  switch (readiness) {
    case "Peak":
      return WineReadiness.PEAK;
    case "Hold":
      return WineReadiness.HOLD;
    default:
      return WineReadiness.READY;
  }
}

export function mapReadinessFromDb(readiness: WineReadiness): WineBottle["readiness"] {
  switch (readiness) {
    case WineReadiness.PEAK:
      return "Peak";
    case WineReadiness.HOLD:
      return "Hold";
    default:
      return "Ready";
  }
}

export function mapCellarStatusToDb(status: WineBottle["cellarStatus"] | undefined) {
  return status === "Drank" ? WineCellarStatus.DRANK : WineCellarStatus.CELLAR;
}

export function mapCellarStatusFromDb(status: WineCellarStatus): WineBottle["cellarStatus"] {
  return status === WineCellarStatus.DRANK ? "Drank" : "Cellar";
}

export function mapLocationRecord(record: WineLocation & { _count?: { wines?: number } }): StorageLocation {
  return {
    id: record.id,
    name: record.name,
    type: mapLocationTypeFromDb(record.type),
    room: record.room ?? "",
    capacity: record.capacity,
    occupied: record._count?.wines ?? 0,
    temperatureC: record.temperatureC,
    humidity: record.humidity,
    notes: record.notes ?? ""
  };
}

export function mapWineRecord(record: WineEntry): WineBottle {
  return {
    id: record.id,
    wineName: record.wineName,
    producer: record.producer,
    imageUrl: record.imageUrl ?? "",
    vintage: record.vintage,
    region: record.region ?? "",
    country: record.country ?? "",
    grape: record.grape ?? "",
    grapeVarieties: record.grapeVarieties ?? "",
    style: record.style ?? "",
    bottleSize: record.bottleSize,
    quantity: record.quantity,
    purchasePrice: record.purchasePrice,
    estimatedValue: record.estimatedValue,
    vivinoLink: record.vivinoLink ?? "",
    vivinoScore: record.vivinoScore,
    vivinoScoreSource: record.vivinoScoreSource ?? "",
    robertParkerScore: record.robertParkerScore,
    jamesSucklingScore: record.jamesSucklingScore,
    criticSource: record.criticSource ?? "",
    locationId: record.locationId,
    shelf: record.shelf ?? "",
    slot: record.slot ?? "",
    readiness: mapReadinessFromDb(record.readiness),
    drinkWindow: record.drinkWindow ?? "",
    acquiredOn: record.acquiredOn ? record.acquiredOn.toISOString().slice(0, 10) : "",
    supplierId: record.supplierId ?? "",
    notes: record.notes ?? "",
    cellarStatus: mapCellarStatusFromDb(record.cellarStatus),
    drankOn: record.drankOn ? record.drankOn.toISOString().slice(0, 10) : ""
  };
}
