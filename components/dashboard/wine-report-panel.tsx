"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { type WineBottle } from "@/lib/wine-data";

export function WineReportPanel() {
  const [wines, setWines] = useState<WineBottle[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/wines", { cache: "no-store" });
      const text = await response.text();

      if (!text) {
        setWines([]);
        return;
      }

      try {
        const payload = JSON.parse(text) as { data?: WineBottle[]; error?: string };

        if (!response.ok) {
          setError(payload.error ?? "Unable to load the wine report.");
          setWines([]);
          return;
        }

        setError(null);
        setWines(payload.data ?? []);
      } catch {
        setError("The server returned an invalid wine report response.");
        setWines([]);
      }
    };

    void load();
  }, []);

  const sortedWines = useMemo(
    () =>
      [...wines].sort((left, right) => {
        const producerCompare = left.producer.localeCompare(right.producer);

        if (producerCompare !== 0) {
          return producerCompare;
        }

        const wineNameCompare = left.wineName.localeCompare(right.wineName);

        if (wineNameCompare !== 0) {
          return wineNameCompare;
        }

        return (right.vintage ?? 0) - (left.vintage ?? 0);
      }),
    [wines]
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Report</p>
        <h2 className="text-3xl font-semibold tracking-tight">All wines report</h2>
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Inventory table</CardDescription>
          <CardTitle>Wine producer / wine name / Vintage / Region / Country / Quantity / Estimated Value / Vivino Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="overflow-x-auto rounded-[1.25rem] border border-border/80">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead>Wine producer</TableHead>
                  <TableHead>Wine name</TableHead>
                  <TableHead>Vintage</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Estimated Value</TableHead>
                  <TableHead className="text-right">Vivino Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedWines.map((wine) => (
                  <TableRow key={wine.id}>
                    <TableCell>{wine.producer || "—"}</TableCell>
                    <TableCell>{wine.wineName || "—"}</TableCell>
                    <TableCell>{wine.vintage ? String(wine.vintage) : "—"}</TableCell>
                    <TableCell>{wine.region || "—"}</TableCell>
                    <TableCell>{wine.country || "—"}</TableCell>
                    <TableCell className="text-right">{wine.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(wine.estimatedValue)}</TableCell>
                    <TableCell className="text-right">{wine.vivinoScore > 0 ? wine.vivinoScore.toFixed(1) : "—"}</TableCell>
                  </TableRow>
                ))}
                {sortedWines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No wines available in the report.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
