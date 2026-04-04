"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { getWineDisplayName } from "@/lib/wine-display";
import { getVivinoPortfolioScore } from "@/lib/wine-score";
import { formatCurrency } from "@/lib/utils";
import { isCellarWine, type WineBottle } from "@/lib/wine-data";

function toggleFilterValue(current: string[], value: string, checked: boolean) {
  if (checked) {
    return current.includes(value) ? current : [...current, value];
  }

  return current.filter((item) => item !== value);
}

function FilterSelect({
  label,
  values,
  options,
  onChange
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <NativeSelect
        multiple
        size={Math.min(Math.max(options.length, 3), 6)}
        value={values}
        className="h-auto min-h-32 py-3"
        onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => option.value))}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </NativeSelect>
      <p className="text-xs text-muted-foreground">
        {values.length > 0 ? `${values.length} selected` : "No filter selected"}
      </p>
    </div>
  );
}

export function ProducerDirectory() {
  const { wines } = useDashboardData();
  const [searchFilter, setSearchFilter] = useState("");
  const [producerFilter, setProducerFilter] = useState<string[]>([]);
  const [vintageFilter, setVintageFilter] = useState<string[]>([]);
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [grapeVarietiesFilter, setGrapeVarietiesFilter] = useState<string[]>([]);
  const [aboveFourOnly, setAboveFourOnly] = useState(false);

  const clearFilters = () => {
    setSearchFilter("");
    setProducerFilter([]);
    setVintageFilter([]);
    setRegionFilter([]);
    setCountryFilter([]);
    setGrapeVarietiesFilter([]);
    setAboveFourOnly(false);
  };

  const cellarWines = useMemo(() => wines.filter(isCellarWine), [wines]);

  const producerOptions = useMemo(
    () => [...new Set(cellarWines.map((wine) => wine.producer.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [cellarWines]
  );

  const vintageOptions = useMemo(
    () =>
      [...new Set(cellarWines.map((wine) => (wine.vintage ? String(wine.vintage) : "")).filter(Boolean))].sort((a, b) => Number(b) - Number(a)),
    [cellarWines]
  );

  const regionOptions = useMemo(
    () => [...new Set(cellarWines.map((wine) => wine.region.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [cellarWines]
  );

  const countryOptions = useMemo(
    () => [...new Set(cellarWines.map((wine) => wine.country.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [cellarWines]
  );

  const grapeVarietiesOptions = useMemo(
    () =>
      [
        ...new Set(
          cellarWines
            .flatMap((wine) => [wine.grape, ...wine.grapeVarieties.split(",")])
            .map((value) => value.trim())
            .filter(Boolean)
        )
      ].sort((a, b) => a.localeCompare(b)),
    [cellarWines]
  );

  const filteredWines = useMemo(
    () =>
      cellarWines.filter((wine) => {
        const haystack = [
          wine.wineName,
          wine.producer,
          wine.grape,
          wine.grapeVarieties,
          wine.region,
          wine.country
        ]
          .join(" ")
          .toLowerCase();
        const normalizedSearch = searchFilter.trim().toLowerCase();
        const matchesProducer = producerFilter.length === 0 || producerFilter.includes(wine.producer.trim());
        const matchesVintage = vintageFilter.length === 0 || vintageFilter.includes(String(wine.vintage ?? ""));
        const matchesRegion = regionFilter.length === 0 || regionFilter.includes(wine.region.trim());
        const matchesCountry = countryFilter.length === 0 || countryFilter.includes(wine.country.trim());
        const wineVarieties = [wine.grape, ...wine.grapeVarieties.split(",")].map((value) => value.trim().toLowerCase()).filter(Boolean);
        const matchesGrapeVarieties =
          grapeVarietiesFilter.length === 0 ||
          grapeVarietiesFilter.some((value) => wineVarieties.some((item) => item.includes(value.toLowerCase())));
        const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
        const matchesScore = !aboveFourOnly || wine.vivinoScore > 4;

        return matchesProducer && matchesVintage && matchesRegion && matchesCountry && matchesGrapeVarieties && matchesSearch && matchesScore;
      }),
    [aboveFourOnly, cellarWines, countryFilter, grapeVarietiesFilter, producerFilter, regionFilter, searchFilter, vintageFilter]
  );

  const producerMap = useMemo(
    () =>
      Array.from(
        filteredWines.reduce((map, wine) => {
          const current = map.get(wine.producer) ?? {
            producer: wine.producer,
            regions: new Set<string>(),
            bottles: 0,
            averageScore: 0,
            totalValue: 0,
            wines: [] as WineBottle[]
          };

          current.regions.add(wine.region);
          current.bottles += wine.quantity;
          current.totalValue += wine.estimatedValue * wine.quantity;
          current.wines.push(wine);
          map.set(wine.producer, current);
          return map;
        }, new Map<string, {
          producer: string;
          regions: Set<string>;
          bottles: number;
          averageScore: number;
          totalValue: number;
          wines: WineBottle[];
        }>())
      ).map(([, value]) => ({
        ...value,
        regions: [...value.regions],
        averageScore:
          value.wines
            .map((wine) => getVivinoPortfolioScore(wine))
            .filter((score): score is number => score !== null)
            .reduce((sum, score) => sum + score, 0) /
            Math.max(
              1,
              value.wines.map((wine) => getVivinoPortfolioScore(wine)).filter((score): score is number => score !== null).length
            )
      })),
    [filteredWines]
  );

  const merchants = useMemo(
    () =>
      Array.from(
        filteredWines.reduce((map, wine) => {
          const merchant = wine.supplierId.trim();

          if (!merchant) {
            return map;
          }

          map.set(merchant, (map.get(merchant) ?? 0) + wine.quantity);
          return map;
        }, new Map<string, number>())
      ).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
    [filteredWines]
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Producers</p>
        <h2 className="text-3xl font-semibold tracking-tight">Celler Analysis</h2>
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Producer filters</CardDescription>
          <CardTitle>Filter by cellar data already in the app</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-primary transition hover:text-primary/80"
            >
              Clear filters
            </button>
          </div>
          <Input
            placeholder="Search wine, producer, grape, or grape varieties"
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <FilterSelect label="Producer" values={producerFilter} options={producerOptions} onChange={setProducerFilter} />
            <FilterSelect label="Vintage" values={vintageFilter} options={vintageOptions} onChange={setVintageFilter} />
            <FilterSelect label="Region" values={regionFilter} options={regionOptions} onChange={setRegionFilter} />
            <FilterSelect label="Country" values={countryFilter} options={countryOptions} onChange={setCountryFilter} />
            <FilterSelect
              label="Grape varieties"
              values={grapeVarietiesFilter}
              options={grapeVarietiesOptions}
              onChange={setGrapeVarietiesFilter}
            />
          </div>
          <label className="flex items-center gap-3 rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={aboveFourOnly}
              onChange={(event) => setAboveFourOnly(event.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span>Only show wines above 4.0 on Vivino</span>
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{filteredWines.length} wines in filter view</span>
            <span>•</span>
            <span>{producerMap.length} producers visible</span>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        {producerMap
          .sort((a, b) => b.totalValue - a.totalValue)
          .map((producer) => (
            <Card key={producer.producer}>
              <CardHeader>
                <CardDescription>{producer.regions.join(" • ")}</CardDescription>
                <CardTitle>{producer.producer}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-3xl bg-secondary/60 p-4">
                    <p className="text-sm text-muted-foreground">Bottles</p>
                    <p className="mt-2 text-2xl font-semibold">{producer.bottles}</p>
                  </div>
                  <div className="rounded-3xl bg-secondary/60 p-4">
                    <p className="text-sm text-muted-foreground">Avg score</p>
                    <p className="mt-2 text-2xl font-semibold">{producer.averageScore.toFixed(2)}</p>
                  </div>
                  <div className="rounded-3xl bg-secondary/60 p-4">
                    <p className="text-sm text-muted-foreground">Est. value</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCurrency(producer.totalValue)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {producer.wines.map((wine) => (
                    <div key={wine.id} className="rounded-3xl border border-border/70 bg-background/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/dashboard/inventory?q=${encodeURIComponent(getWineDisplayName(wine.wineName, wine.vintage))}`}
                            className="font-semibold transition hover:text-primary"
                          >
                            {getWineDisplayName(wine.wineName, wine.vintage)}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {wine.vintage} • {wine.style} • {wine.grape} • Qty {wine.quantity}
                          </p>
                          <Link
                            href={`/dashboard/inventory?q=${encodeURIComponent(getWineDisplayName(wine.wineName, wine.vintage))}`}
                            className="mt-2 inline-flex text-xs font-medium text-primary transition hover:text-primary/80"
                          >
                            Open in inventory
                          </Link>
                        </div>
                        <span className="text-sm font-medium text-primary">{(getVivinoPortfolioScore(wine) ?? 0).toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        {producerMap.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-background/50 p-6 text-sm text-muted-foreground">
            No producers match the current filters.
          </div>
        ) : null}
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Purchase Sources</CardDescription>
          <CardTitle>Merchants linked to the current inventory</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {merchants.map(([merchant, bottleCount]) => (
            <div key={merchant} className="rounded-3xl border border-border/70 bg-background/70 p-4">
              <p className="font-semibold">{merchant}</p>
              <p className="mt-2 text-sm text-muted-foreground">{bottleCount} {bottleCount === 1 ? "wine" : "wines"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
