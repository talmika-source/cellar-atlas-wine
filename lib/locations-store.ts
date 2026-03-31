import { prisma } from "@/lib/db/prisma";
import { readStoredLocations, readStoredWines, writeStoredLocations } from "@/lib/wine-file-store";
import { mapLocationRecord, mapLocationTypeToDb } from "@/lib/wine-persistence";
import { isCellarWine, type StorageLocation } from "@/lib/wine-data";

export type LocationRecord = StorageLocation;
export type LocationInput = Omit<LocationRecord, "id" | "occupied">;

export async function listLocations() {
  try {
    const records = await prisma.wineLocation.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        _count: {
          select: {
            wines: true
          }
        }
      }
    });

    return records.map(mapLocationRecord);
  } catch {
    const [locations, wines] = await Promise.all([readStoredLocations(), readStoredWines()]);
    return locations.map((location) => ({
      ...location,
      occupied: wines.filter((wine) => wine.locationId === location.id && isCellarWine(wine)).reduce((sum, wine) => sum + wine.quantity, 0)
    }));
  }
}

export async function getLocation(id: string) {
  try {
    const record = await prisma.wineLocation.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            wines: true
          }
        }
      }
    });

    return record ? mapLocationRecord(record) : null;
  } catch {
    const locations = await listLocations();
    return locations.find((location: LocationRecord) => location.id === id) ?? null;
  }
}

export async function createLocation(input: LocationInput) {
  try {
    const record = await prisma.wineLocation.create({
      data: {
        name: input.name,
        type: mapLocationTypeToDb(input.type),
        room: input.room || null,
        capacity: input.capacity,
        temperatureC: input.temperatureC,
        humidity: input.humidity,
        notes: input.notes || null
      },
      include: {
        _count: {
          select: {
            wines: true
          }
        }
      }
    });

    return mapLocationRecord(record);
  } catch {
    try {
      const locations = await readStoredLocations();
      const location: LocationRecord = {
        ...input,
        id: `loc-${Date.now()}`,
        occupied: 0
      };
      locations.unshift(location);
      await writeStoredLocations(locations);
      return location;
    } catch {
      throw new Error("Location storage is unavailable. On Vercel, connect a working Postgres database and run the Prisma schema setup.");
    }
  }
}

export async function updateLocation(id: string, patch: Partial<LocationInput>) {
  try {
    const existing = await prisma.wineLocation.findUnique({
      where: { id }
    });

    if (!existing) {
      return null;
    }

    const record = await prisma.wineLocation.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.type !== undefined ? { type: mapLocationTypeToDb(patch.type) } : {}),
        ...(patch.room !== undefined ? { room: patch.room || null } : {}),
        ...(patch.capacity !== undefined ? { capacity: patch.capacity } : {}),
        ...(patch.temperatureC !== undefined ? { temperatureC: patch.temperatureC } : {}),
        ...(patch.humidity !== undefined ? { humidity: patch.humidity } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes || null } : {})
      },
      include: {
        _count: {
          select: {
            wines: true
          }
        }
      }
    });

    return mapLocationRecord(record);
  } catch {
    try {
      const locations = await readStoredLocations();
      const index = locations.findIndex((location) => location.id === id);

      if (index === -1) {
        return null;
      }

      locations[index] = {
        ...locations[index],
        ...patch
      };

      await writeStoredLocations(locations);
      return (await listLocations()).find((location: LocationRecord) => location.id === id) ?? null;
    } catch {
      throw new Error("Location storage is unavailable. On Vercel, connect a working Postgres database and run the Prisma schema setup.");
    }
  }
}

export async function deleteLocation(id: string) {
  try {
    const existing = await prisma.wineLocation.findUnique({
      where: { id }
    });

    if (!existing) {
      return false;
    }

    await prisma.wineLocation.delete({
      where: { id }
    });

    return true;
  } catch {
    try {
      const locations = await readStoredLocations();
      const nextLocations = locations.filter((location) => location.id !== id);

      if (nextLocations.length === locations.length) {
        return false;
      }

      await writeStoredLocations(nextLocations);
      return true;
    } catch {
      throw new Error("Location storage is unavailable. On Vercel, connect a working Postgres database and run the Prisma schema setup.");
    }
  }
}

export async function getDefaultLocationId() {
  try {
    const location = await prisma.wineLocation.findFirst({
      orderBy: [{ createdAt: "asc" }]
    });

    return location?.id ?? "";
  } catch {
    const locations = await readStoredLocations();
    return locations[0]?.id ?? "";
  }
}
