import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { type StorageLocation, type WineBottle } from "@/lib/wine-data";

const dataDirectory = path.join(process.cwd(), "data");
const winesPath = path.join(dataDirectory, "wines.json");
const locationsPath = path.join(dataDirectory, "locations.json");

async function ensureFile(filePath: string) {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }
}

async function readJsonFile<T>(filePath: string) {
  await ensureFile(filePath);
  const raw = await readFile(filePath, "utf8");

  try {
    return JSON.parse(raw) as T;
  } catch {
    return [] as T;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await ensureFile(filePath);
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

export async function readStoredWines() {
  const wines = await readJsonFile<WineBottle[]>(winesPath);
  return wines.map((wine) => ({
    ...wine,
    cellarStatus: wine.cellarStatus ?? "Cellar",
    drankOn: wine.drankOn ?? ""
  }));
}

export async function writeStoredWines(wines: WineBottle[]) {
  await writeJsonFile(winesPath, wines);
}

export async function readStoredLocations() {
  return readJsonFile<StorageLocation[]>(locationsPath);
}

export async function writeStoredLocations(locations: StorageLocation[]) {
  await writeJsonFile(locationsPath, locations);
}
