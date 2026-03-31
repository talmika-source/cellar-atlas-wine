import { type StorageLocation, type WineBottle, type WineCellarStatus } from "@/lib/wine-data";

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ValidatedLocationInput = {
  name: string;
  type: StorageLocation["type"];
  room: string;
  capacity: number;
  temperatureC: number;
  humidity: number;
  notes: string;
};

export type ValidatedWineInput = Omit<WineBottle, "id">;

const locationTypes: StorageLocation["type"][] = ["Fridge", "Cellar", "Cabinet", "Locker"];
const readinessValues: WineBottle["readiness"][] = ["Hold", "Ready", "Peak"];
const cellarStatusValues: WineCellarStatus[] = ["Cellar", "Drank"];

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asPositiveInteger(value: unknown) {
  const number = asNumber(value);
  return number !== null && Number.isInteger(number) && number > 0 ? number : null;
}

function asYear(value: unknown) {
  const number = asNumber(value);
  if (number === null) {
    return null;
  }

  if (!Number.isInteger(number) || number < 1900 || number > 2100) {
    return null;
  }

  return number;
}

function asDateString(value: unknown) {
  const text = asTrimmedString(value);

  if (!text) {
    return "";
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

export function validateLocationInput(payload: unknown, options: { partial?: boolean } = {}): ValidationResult<ValidatedLocationInput | Partial<ValidatedLocationInput>> {
  const body = (payload ?? {}) as Record<string, unknown>;
  const partial = options.partial ?? false;
  const name = asTrimmedString(body.name);
  const type = locationTypes.includes(body.type as StorageLocation["type"]) ? (body.type as StorageLocation["type"]) : undefined;
  const room = asOptionalString(body.room);
  const capacity = asNumber(body.capacity);
  const temperatureC = asNumber(body.temperatureC);
  const humidity = asNumber(body.humidity);
  const notes = asOptionalString(body.notes);

  if (!partial && !name) {
    return { success: false, error: "Location name is required." };
  }

  if (capacity !== null && capacity < 0) {
    return { success: false, error: "Capacity must be zero or greater." };
  }

  if (humidity !== null && (humidity < 0 || humidity > 100)) {
    return { success: false, error: "Humidity must be between 0 and 100." };
  }

  if (temperatureC !== null && (temperatureC < -10 || temperatureC > 40)) {
    return { success: false, error: "Temperature must be between -10C and 40C." };
  }

  const data = partial
    ? {
        ...(name ? { name } : {}),
        ...(type ? { type } : {}),
        ...(body.room !== undefined ? { room } : {}),
        ...(capacity !== null ? { capacity } : {}),
        ...(temperatureC !== null ? { temperatureC } : {}),
        ...(humidity !== null ? { humidity } : {}),
        ...(body.notes !== undefined ? { notes } : {})
      }
    : {
        name,
        type: type ?? "Fridge",
        room,
        capacity: capacity ?? 0,
        temperatureC: temperatureC ?? 12,
        humidity: humidity ?? 65,
        notes
      };

  return { success: true, data };
}

export function validateWineInput(payload: unknown, options: { partial?: boolean } = {}): ValidationResult<ValidatedWineInput | Partial<ValidatedWineInput>> {
  const body = (payload ?? {}) as Record<string, unknown>;
  const partial = options.partial ?? false;

  const wineName = asTrimmedString(body.wineName);
  const producer = asTrimmedString(body.producer);
  const imageUrl = asOptionalString(body.imageUrl);
  const vintage = body.vintage === null || body.vintage === undefined || body.vintage === "" ? null : asYear(body.vintage);
  const region = asOptionalString(body.region);
  const country = asOptionalString(body.country);
  const grape = asOptionalString(body.grape);
  const style = asOptionalString(body.style);
  const bottleSize = asOptionalString(body.bottleSize) || "750ml";
  const quantity = asPositiveInteger(body.quantity);
  const purchasePrice = asNumber(body.purchasePrice);
  const estimatedValue = asNumber(body.estimatedValue);
  const vivinoLink = asOptionalString(body.vivinoLink);
  const vivinoScore = asNumber(body.vivinoScore);
  const robertParkerScore = asNumber(body.robertParkerScore);
  const jamesSucklingScore = asNumber(body.jamesSucklingScore);
  const criticSource = asOptionalString(body.criticSource);
  const locationId = asTrimmedString(body.locationId);
  const shelf = asOptionalString(body.shelf);
  const slot = asOptionalString(body.slot);
  const readiness = readinessValues.includes(body.readiness as WineBottle["readiness"]) ? (body.readiness as WineBottle["readiness"]) : undefined;
  const drinkWindow = asOptionalString(body.drinkWindow);
  const acquiredOn = asDateString(body.acquiredOn);
  const supplierId = asOptionalString(body.supplierId);
  const notes = asOptionalString(body.notes);
  const cellarStatus = cellarStatusValues.includes(body.cellarStatus as WineCellarStatus)
    ? (body.cellarStatus as WineCellarStatus)
    : undefined;
  const drankOn = asDateString(body.drankOn);

  if (!partial) {
    if (!wineName) {
      return { success: false, error: "Wine name is required." };
    }

    if (!producer) {
      return { success: false, error: "Producer is required." };
    }

    if (!locationId) {
      return { success: false, error: "Location is required." };
    }
  }

  if (body.vintage !== undefined && body.vintage !== null && body.vintage !== "" && vintage === null) {
    return { success: false, error: "Vintage must be a valid year." };
  }

  if (quantity !== null && quantity < 1) {
    return { success: false, error: "Quantity must be at least 1." };
  }

  for (const [label, value] of [
    ["Purchase price", purchasePrice],
    ["Estimated value", estimatedValue],
    ["Vivino score", vivinoScore],
    ["Robert Parker score", robertParkerScore],
    ["James Suckling score", jamesSucklingScore]
  ] as const) {
    if (value !== null && value < 0) {
      return { success: false, error: `${label} cannot be negative.` };
    }
  }

  const data = partial
    ? {
        ...(wineName ? { wineName } : {}),
        ...(producer ? { producer } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl } : {}),
        ...(body.vintage !== undefined ? { vintage } : {}),
        ...(body.region !== undefined ? { region } : {}),
        ...(body.country !== undefined ? { country } : {}),
        ...(body.grape !== undefined ? { grape } : {}),
        ...(body.style !== undefined ? { style } : {}),
        ...(body.bottleSize !== undefined ? { bottleSize } : {}),
        ...(quantity !== null ? { quantity } : {}),
        ...(purchasePrice !== null ? { purchasePrice } : {}),
        ...(estimatedValue !== null ? { estimatedValue } : {}),
        ...(body.vivinoLink !== undefined ? { vivinoLink } : {}),
        ...(vivinoScore !== null ? { vivinoScore } : {}),
        ...(robertParkerScore !== null ? { robertParkerScore } : {}),
        ...(jamesSucklingScore !== null ? { jamesSucklingScore } : {}),
        ...(body.criticSource !== undefined ? { criticSource } : {}),
        ...(locationId ? { locationId } : {}),
        ...(body.shelf !== undefined ? { shelf } : {}),
        ...(body.slot !== undefined ? { slot } : {}),
        ...(readiness ? { readiness } : {}),
        ...(body.drinkWindow !== undefined ? { drinkWindow } : {}),
        ...(body.acquiredOn !== undefined ? { acquiredOn } : {}),
        ...(body.supplierId !== undefined ? { supplierId } : {}),
        ...(body.notes !== undefined ? { notes } : {}),
        ...(cellarStatus ? { cellarStatus } : {}),
        ...(body.drankOn !== undefined ? { drankOn } : {})
      }
    : {
        wineName,
        producer,
        imageUrl,
        vintage,
        region,
        country,
        grape,
        style,
        bottleSize,
        quantity: quantity ?? 1,
        purchasePrice: purchasePrice ?? 0,
        estimatedValue: estimatedValue ?? 0,
        vivinoLink,
        vivinoScore: vivinoScore ?? 0,
        robertParkerScore: robertParkerScore ?? 0,
        jamesSucklingScore: jamesSucklingScore ?? 0,
        criticSource,
        locationId,
        shelf,
        slot,
        readiness: readiness ?? "Ready",
        drinkWindow,
        acquiredOn,
        supplierId,
        notes,
        cellarStatus: cellarStatus ?? "Cellar",
        drankOn
      };

  return { success: true, data };
}
