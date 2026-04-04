"use client";

import { useMemo } from "react";

import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { isCellarWine } from "@/lib/wine-data";

export function WineReportPanel() {
  const { wines, winesError } = useDashboardData();

  const cellarWines = useMemo(() => wines.filter(isCellarWine), [wines]);

  const sortedWines = useMemo(
    () =>
      [...cellarWines].sort((left, right) => {
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
    [cellarWines]
  );

  const totals = useMemo(
    () => ({
      bottles: sortedWines.reduce((sum, wine) => sum + wine.quantity, 0),
      value: sortedWines.reduce((sum, wine) => sum + wine.estimatedValue * wine.quantity, 0)
    }),
    [sortedWines]
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
          <CardTitle>In-cellar wine report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {winesError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{winesError}</div>
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
                    <TableCell className="text-right">{formatCurrency(wine.estimatedValue * wine.quantity)}</TableCell>
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

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">Total bottles in cellar</p>
              <p className="mt-2 text-2xl font-semibold">{totals.bottles}</p>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">Total estimated cellar value</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(totals.value)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
