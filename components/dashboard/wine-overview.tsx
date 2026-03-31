"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Clock3, Snowflake, Star } from "lucide-react";

import { KpiCard } from "@/components/cards/kpi-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getWineDisplayTitle, hasVintageInWineName } from "@/lib/wine-display";
import { formatWinePlacement } from "@/lib/wine-location-display";
import { formatCurrency } from "@/lib/utils";
import { isCellarWine, type StorageLocation, type WineBottle } from "@/lib/wine-data";

export function WineOverview() {
  const [wines, setWines] = useState<WineBottle[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);

  const readResponsePayload = async <T,>(response: Response) => {
    const text = await response.text();

    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return {} as T;
    }
  };

  useEffect(() => {
    const load = async () => {
      const [wineResponse, locationResponse] = await Promise.all([
        fetch("/api/wines", { cache: "no-store" }),
        fetch("/api/locations", { cache: "no-store" })
      ]);

      const winePayload = wineResponse.ok ? await readResponsePayload<{ data?: WineBottle[] }>(wineResponse) : {};
      const locationPayload = locationResponse.ok ? await readResponsePayload<{ data?: StorageLocation[] }>(locationResponse) : {};
      setWines(winePayload.data ?? []);
      setLocations(locationPayload.data ?? []);
    };

    void load();
  }, []);

  const {
    totalBottles,
    totalValue,
    readyBottles,
    highValueBottles,
    topRated,
    peakBottles,
    peakPriority,
    totalCapacity,
    totalOccupied
  } = useMemo(() => {
    const cellarWines = wines.filter(isCellarWine);
    const totalBottleCount = cellarWines.reduce((sum, wine) => sum + wine.quantity, 0);
    const totalCellarValue = cellarWines.reduce((sum, wine) => sum + wine.estimatedValue * wine.quantity, 0);
    const readyBottleCount = cellarWines.filter((wine) => wine.readiness !== "Hold").reduce((sum, wine) => sum + wine.quantity, 0);
    const peakBottleCount = cellarWines.filter((wine) => wine.readiness === "Peak").reduce((sum, wine) => sum + wine.quantity, 0);

    return {
      totalBottles: totalBottleCount,
      totalValue: totalCellarValue,
      readyBottles: readyBottleCount,
      peakBottles: peakBottleCount,
      highValueBottles: cellarWines.filter((wine) => wine.estimatedValue >= 100).length,
      topRated: [...cellarWines].sort((a, b) => b.vivinoScore - a.vivinoScore).slice(0, 4),
      peakPriority: cellarWines.filter((wine) => wine.readiness === "Peak").slice(0, 5),
      totalCapacity: locations.reduce((sum, location) => sum + location.capacity, 0),
      totalOccupied: totalBottleCount
    };
  }, [locations, wines]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Tracked Bottles" value={String(totalBottles)} trend={`${wines.filter(isCellarWine).length} unique wines across all locations`} />
        <KpiCard label="Estimated Cellar Value" value={formatCurrency(totalValue)} trend="+Scan assist and manual entry enabled" tone="success" />
        <KpiCard label="Ready To Drink" value={String(readyBottles)} trend="Bottles currently in ready or peak window" tone="warning" />
        <KpiCard label="High-Value Bottles" value={String(highValueBottles)} trend="Vivino favorites and collector picks" tone="danger" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden bg-[linear-gradient(135deg,rgba(92,20,35,0.95),rgba(47,16,23,0.92))] text-white">
          <CardHeader>
            <CardDescription className="text-rose-100/80">Cellar Snapshot</CardDescription>
            <CardTitle className="text-3xl leading-tight">Responsive wine inventory control for fridges, shelves, and long-term storage.</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-sm text-rose-100/80">
                <Snowflake className="h-4 w-4" />
                Storage utilization
              </div>
              <p className="mt-3 text-3xl font-semibold">{totalCapacity ? Math.round((totalOccupied / totalCapacity) * 100) : 0}%</p>
              <p className="mt-2 text-sm text-rose-100/80">
                {totalOccupied} bottles tracked across {locations.length} storage zones.
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-sm text-rose-100/80">
                <Clock3 className="h-4 w-4" />
                Peak Bottles
              </div>
              <p className="mt-3 text-3xl font-semibold">{peakBottles}</p>
              <p className="mt-2 text-sm text-rose-100/80">Only bottles currently marked as peak maturity are counted here.</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-sm text-rose-100/80">
                <Star className="h-4 w-4" />
                Collector score
              </div>
              <p className="mt-3 text-3xl font-semibold">
                {wines.filter(isCellarWine).length
                  ? (wines.filter(isCellarWine).reduce((sum, wine) => sum + wine.vivinoScore, 0) / wines.filter(isCellarWine).length).toFixed(2)
                  : "0.00"}
              </p>
              <p className="mt-2 text-sm text-rose-100/80">Average Vivino score across the tracked portfolio.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Priority Bottles</CardDescription>
            <CardTitle>Drink or move soon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {peakPriority.map((wine) => (
              <div key={wine.id} className="rounded-3xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {getWineDisplayTitle(wine)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(hasVintageInWineName(wine.wineName, wine.vintage) ? null : wine.vintage) ? `${wine.vintage} • ` : ""}
                      {[wine.region, formatWinePlacement(wine.shelf, wine.slot)].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700">{wine.readiness}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{wine.notes}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardDescription>Storage Locations</CardDescription>
            <CardTitle>Capacity and environment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {locations.map((location) => {
              const bottleCount = wines.filter((wine) => wine.locationId === location.id && isCellarWine(wine)).reduce((sum, wine) => sum + wine.quantity, 0);
              return (
                <div key={location.id} className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{location.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {location.type} • {location.room}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-primary">
                      {bottleCount}/{location.capacity}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                    <p>{location.temperatureC}C target storage temperature</p>
                    <p>{location.humidity}% humidity</p>
                    <p>{location.notes}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Top Rated Bottles</CardDescription>
            <CardTitle>Quick access favorites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topRated.map((wine) => (
              <a
                key={wine.id}
                href={wine.vivinoLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-3xl border border-border/70 bg-background/70 p-4 transition hover:border-primary/40 hover:bg-background"
              >
                <div>
                  <p className="font-semibold">
                    {getWineDisplayTitle(wine)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(hasVintageInWineName(wine.wineName, wine.vintage) ? null : wine.vintage) ? `${wine.vintage} • ` : ""}
                    {wine.region}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  {wine.vivinoScore.toFixed(1)}
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </a>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
