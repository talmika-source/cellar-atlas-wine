"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { type StorageLocation, type WineBottle } from "@/lib/wine-data";

type DashboardDataContextValue = {
  wines: WineBottle[];
  locations: StorageLocation[];
  winesLoading: boolean;
  locationsLoading: boolean;
  winesError: string | null;
  locationsError: string | null;
  databaseIssue: {
    active: boolean;
    title: string;
    message: string | null;
    guidance: string | null;
  };
  refreshWines: () => Promise<WineBottle[]>;
  refreshLocations: () => Promise<StorageLocation[]>;
  refreshAll: () => Promise<void>;
  upsertWine: (wine: WineBottle) => void;
  removeWineFromState: (wineId: string) => void;
  upsertLocation: (location: StorageLocation) => void;
  removeLocationFromState: (locationId: string) => void;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

async function readResponsePayload<T>(response: Response) {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: "The server returned an invalid response." } as T;
  }
}

function inferDatabaseGuidance(message: string | null) {
  if (!message) {
    return null;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("monthly free plan limit") || normalized.includes("network transfer allowance") || normalized.includes("paused")) {
    return "Your Neon project may be paused after hitting its plan limit. Resume or upgrade the Neon project, then retry from Monitoring.";
  }

  if (normalized.includes("can't reach database server") || normalized.includes("timed out") || normalized.includes("unreachable")) {
    return "The database is configured but currently unreachable. Check Neon project status, branch, and network availability.";
  }

  if (normalized.includes("authentication failed") || normalized.includes("password")) {
    return "The database credentials may be invalid. Recheck the Production DATABASE_URL in Vercel.";
  }

  return "The database could not be read. Open Monitoring for recovery steps and a live health check.";
}

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const [wines, setWines] = useState<WineBottle[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [winesLoading, setWinesLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [winesError, setWinesError] = useState<string | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const refreshWines = async () => {
    setWinesLoading(true);

    try {
      const response = await fetch("/api/wines", { cache: "no-store" });
      const payload = await readResponsePayload<{ data?: WineBottle[]; error?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load wines.");
      }

      const nextWines = payload.data ?? [];
      setWines(nextWines);
      setWinesError(null);
      return nextWines;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load wines.";
      setWines([]);
      setWinesError(message);
      throw error;
    } finally {
      setWinesLoading(false);
    }
  };

  const refreshLocations = async () => {
    setLocationsLoading(true);

    try {
      const response = await fetch("/api/locations", { cache: "no-store" });
      const payload = await readResponsePayload<{ data?: StorageLocation[]; error?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load storage locations.");
      }

      const nextLocations = payload.data ?? [];
      setLocations(nextLocations);
      setLocationsError(null);
      return nextLocations;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load storage locations.";
      setLocations([]);
      setLocationsError(message);
      throw error;
    } finally {
      setLocationsLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.allSettled([refreshWines(), refreshLocations()]);
  };

  const upsertWine = (updatedWine: WineBottle) => {
    setWines((current) => {
      const next = [...current];
      const index = next.findIndex((wine) => wine.id === updatedWine.id);

      if (index === -1) {
        next.unshift(updatedWine);
        return next;
      }

      next[index] = updatedWine;
      return next;
    });
  };

  const removeWineFromState = (wineId: string) => {
    setWines((current) => current.filter((wine) => wine.id !== wineId));
  };

  const upsertLocation = (updatedLocation: StorageLocation) => {
    setLocations((current) => {
      const next = [...current];
      const index = next.findIndex((location) => location.id === updatedLocation.id);

      if (index === -1) {
        next.unshift(updatedLocation);
        return next;
      }

      next[index] = updatedLocation;
      return next;
    });
  };

  const removeLocationFromState = (locationId: string) => {
    setLocations((current) => current.filter((location) => location.id !== locationId));
  };

  useEffect(() => {
    void Promise.allSettled([refreshWines(), refreshLocations()]);
  }, []);

  const value: DashboardDataContextValue = {
    wines,
    locations,
    winesLoading,
    locationsLoading,
    winesError,
    locationsError,
    databaseIssue: {
      active: Boolean(winesError || locationsError),
      title: "Database attention needed",
      message: winesError ?? locationsError,
      guidance: inferDatabaseGuidance(winesError ?? locationsError)
    },
    refreshWines,
    refreshLocations,
    refreshAll,
    upsertWine,
    removeWineFromState,
    upsertLocation,
    removeLocationFromState
  };

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);

  if (!context) {
    throw new Error("useDashboardData must be used within a DashboardDataProvider.");
  }

  return context;
}
