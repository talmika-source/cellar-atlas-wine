"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { isCellarWine, type WineBottle } from "@/lib/wine-data";

type SortKey = "producer" | "wineName" | "vintage" | "region" | "country" | "quantity" | "estimatedValue" | "vivinoScore";
type SortDirection = "asc" | "desc";

function getSortValue(wine: WineBottle, key: SortKey) {
  switch (key) {
    case "producer":
      return wine.producer || "";
    case "wineName":
      return wine.wineName || "";
    case "vintage":
      return wine.vintage ?? 0;
    case "region":
      return wine.region || "";
    case "country":
      return wine.country || "";
    case "quantity":
      return wine.quantity;
    case "estimatedValue":
      return wine.estimatedValue * wine.quantity;
    case "vivinoScore":
      return wine.vivinoScore;
    default:
      return "";
  }
}

export function WineReportPanel() {
  const { wines, winesError } = useDashboardData();
  const [sortKey, setSortKey] = useState<SortKey>("producer");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const cellarWines = useMemo(() => wines.filter(isCellarWine), [wines]);

  const sortedWines = useMemo(() => {
    const next = [...cellarWines];

    next.sort((left, right) => {
      const leftValue = getSortValue(left, sortKey);
      const rightValue = getSortValue(right, sortKey);

      let comparison = 0;

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        comparison = leftValue - rightValue;
      } else {
        comparison = String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: "base" });
      }

      if (comparison === 0) {
        comparison = left.producer.localeCompare(right.producer, undefined, { sensitivity: "base" });
      }

      if (comparison === 0) {
        comparison = left.wineName.localeCompare(right.wineName, undefined, { sensitivity: "base" });
      }

      if (comparison === 0) {
        comparison = (left.vintage ?? 0) - (right.vintage ?? 0);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return next;
  }, [cellarWines, sortDirection, sortKey]);

  const totals = useMemo(
    () => ({
      bottles: sortedWines.reduce((sum, wine) => sum + wine.quantity, 0),
      value: sortedWines.reduce((sum, wine) => sum + wine.estimatedValue * wine.quantity, 0)
    }),
    [sortedWines]
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "vintage" || key === "quantity" || key === "estimatedValue" || key === "vivinoScore" ? "desc" : "asc");
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5" />;
    }

    return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

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
                  <TableHead><Button variant="ghost" size="sm" className="-ml-3 h-8 px-3" onClick={() => toggleSort("producer")}>Wine producer {renderSortIcon("producer")}</Button></TableHead>
                  <TableHead><Button variant="ghost" size="sm" className="-ml-3 h-8 px-3" onClick={() => toggleSort("wineName")}>Wine name {renderSortIcon("wineName")}</Button></TableHead>
                  <TableHead><Button variant="ghost" size="sm" className="-ml-3 h-8 px-3" onClick={() => toggleSort("vintage")}>Vintage {renderSortIcon("vintage")}</Button></TableHead>
                  <TableHead><Button variant="ghost" size="sm" className="-ml-3 h-8 px-3" onClick={() => toggleSort("region")}>Region {renderSortIcon("region")}</Button></TableHead>
                  <TableHead><Button variant="ghost" size="sm" className="-ml-3 h-8 px-3" onClick={() => toggleSort("country")}>Country {renderSortIcon("country")}</Button></TableHead>
                  <TableHead className="text-right"><Button variant="ghost" size="sm" className="ml-auto h-8 px-3" onClick={() => toggleSort("quantity")}>Quantity {renderSortIcon("quantity")}</Button></TableHead>
                  <TableHead className="text-right"><Button variant="ghost" size="sm" className="ml-auto h-8 px-3" onClick={() => toggleSort("estimatedValue")}>Estimated Value {renderSortIcon("estimatedValue")}</Button></TableHead>
                  <TableHead className="text-right"><Button variant="ghost" size="sm" className="ml-auto h-8 px-3" onClick={() => toggleSort("vivinoScore")}>Vivino Score {renderSortIcon("vivinoScore")}</Button></TableHead>
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
