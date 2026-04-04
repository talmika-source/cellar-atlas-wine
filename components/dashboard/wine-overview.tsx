"use client";

import { useMemo } from "react";
import { ArrowUpRight, Clock3, Snowflake, Star } from "lucide-react";

import { KpiCard } from "@/components/cards/kpi-card";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getWineDisplayTitle, hasVintageInWineName } from "@/lib/wine-display";
import { formatWinePlacement } from "@/lib/wine-location-display";
import { getVivinoPortfolioScore } from "@/lib/wine-score";
import { formatCurrency } from "@/lib/utils";
import { isCellarWine, type WineBottle } from "@/lib/wine-data";

export function WineOverview() {
  const { wines, locations } = useDashboardData();

  const {
    totalBottles,
    totalValue,
    readyBottles,
    highValueBottles,
    topRated,
    peakBottles,
    averageScore,
    averageScoreLabel,
    totalCapacity,
    totalOccupied,
    topCountries
  } = useMemo(() => {
    const cellarWines = wines.filter(isCellarWine);
    const totalBottleCount = cellarWines.reduce((sum, wine) => sum + wine.quantity, 0);
    const totalCellarValue = cellarWines.reduce((sum, wine) => sum + wine.estimatedValue * wine.quantity, 0);
    const readyBottleCount = cellarWines.filter((wine) => wine.readiness !== "Hold").reduce((sum, wine) => sum + wine.quantity, 0);
    const peakBottleCount = cellarWines.filter((wine) => wine.readiness === "Peak").reduce((sum, wine) => sum + wine.quantity, 0);
    const scoredWines = cellarWines
      .map((wine) => ({ wine, score: getVivinoPortfolioScore(wine) }))
      .filter((entry) => entry.score !== null) as Array<{ wine: WineBottle; score: number }>;

    return {
      totalBottles: totalBottleCount,
      totalValue: totalCellarValue,
      readyBottles: readyBottleCount,
      peakBottles: peakBottleCount,
      highValueBottles: cellarWines.filter((wine) => wine.estimatedValue >= 100).length,
      topRated: [...cellarWines].sort((a, b) => (getVivinoPortfolioScore(b) ?? 0) - (getVivinoPortfolioScore(a) ?? 0)).slice(0, 4),
      averageScore: scoredWines.length
        ? (scoredWines.reduce((sum, entry) => sum + entry.score, 0) / scoredWines.length).toFixed(2)
        : "0.00",
      averageScoreLabel: scoredWines.length > 0 ? "Average Vivino score across tracked bottles." : "No Vivino scores available yet.",
      totalCapacity: locations.reduce((sum, location) => sum + location.capacity, 0),
      totalOccupied: totalBottleCount,
      topCountries: Object.entries(
        cellarWines.reduce<Record<string, number>>((accumulator, wine) => {
          const country = wine.country.trim();

          if (!country) {
            return accumulator;
          }

          accumulator[country] = (accumulator[country] ?? 0) + 1;
          return accumulator;
        }, {})
      )
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 4)
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

      <section>
        <Card className="overflow-hidden bg-[linear-gradient(135deg,rgba(11,23,43,0.98),rgba(17,31,56,0.95))] text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-200/80">Cellar Snapshot</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-200/80">
                <Snowflake className="h-4 w-4" />
                Storage utilization
              </div>
              <p className="mt-3 text-3xl font-semibold">{totalCapacity ? Math.round((totalOccupied / totalCapacity) * 100) : 0}%</p>
              <p className="mt-2 text-sm text-slate-200/80">
                {totalOccupied} bottles tracked across {locations.length} storage zones.
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-200/80">
                <Clock3 className="h-4 w-4" />
                Peak Bottles
              </div>
              <p className="mt-3 text-3xl font-semibold">{peakBottles}</p>
              <p className="mt-2 text-sm text-slate-200/80">Only bottles currently marked as peak maturity are counted here.</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-200/80">
                <Star className="h-4 w-4" />
                Portfolio score
              </div>
              <p className="mt-3 text-3xl font-semibold">{averageScore}</p>
              <p className="mt-2 text-sm text-slate-200/80">{averageScoreLabel}</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-200/80">
                <ArrowUpRight className="h-4 w-4" />
                Top countries
              </div>
              <div className="mt-3 space-y-2">
                {topCountries.length > 0 ? (
                  topCountries.map(([country, count]) => (
                    <div key={country} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-white">{country}</span>
                      <span className="shrink-0 rounded-full bg-teal-400/15 px-2.5 py-1 text-xs font-medium text-teal-100 ring-1 ring-teal-300/20">
                        {count} {count === 1 ? "wine" : "wines"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-200/80">Add wines with country data to see your top regions represented here.</p>
                )}
              </div>
            </div>
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
                  {(getVivinoPortfolioScore(wine) ?? 0).toFixed(1)}
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
