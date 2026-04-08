"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, FileWarning, HardDriveDownload, ImageIcon, RefreshCw, Wine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MonitoringPayload = {
  ok: boolean;
  checkedAt: string;
  database: {
    configured: boolean;
    reachable: boolean;
    mode: "database" | "file-fallback";
    provider: string;
    error?: string;
    guidance?: string;
  };
  inventory: {
    wineRecords: number;
    totalBottles: number;
    cellarBottles: number;
    drankBottles: number;
    locations: number;
    withImages: number;
    withVivinoScores: number;
    manualVivinoOverrides: number;
  };
  fallback: {
    fileWineRecords: number;
    fileLocationRecords: number;
    active: boolean;
  };
  alerts: Array<{
    severity: "info" | "warning" | "error";
    title: string;
    detail: string;
  }>;
};

const emptyPayload: MonitoringPayload = {
  ok: false,
  checkedAt: "",
  database: {
    configured: false,
    reachable: false,
    mode: "file-fallback",
    provider: "unknown"
  },
  inventory: {
    wineRecords: 0,
    totalBottles: 0,
    cellarBottles: 0,
    drankBottles: 0,
    locations: 0,
    withImages: 0,
    withVivinoScores: 0,
    manualVivinoOverrides: 0
  },
  fallback: {
    fileWineRecords: 0,
    fileLocationRecords: 0,
    active: false
  },
  alerts: []
};

function formatCheckedAt(value: string) {
  if (!value) {
    return "Not checked yet";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export function MonitoringPanel() {
  const [data, setData] = useState<MonitoringPayload>(emptyPayload);
  const [isLoading, setIsLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setRequestError(null);

    try {
      const response = await fetch("/api/monitoring", { cache: "no-store" });
      const payload = (await response.json()) as MonitoringPayload;
      setData(payload);

      if (!response.ok) {
        setRequestError(payload.database.error ?? "Monitoring checks failed.");
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to load monitoring data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const statusTone = data.database.reachable ? "text-emerald-600" : "text-rose-600";
  const StatusIcon = data.database.reachable ? CheckCircle2 : AlertTriangle;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Monitoring</p>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">Platform Health Indicators</h2>
            <p className="text-sm text-muted-foreground">
              Use this page to confirm the live database is reachable, your wine counts still look right, and fallback risk is visible before data loss scares you again.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh checks
          </Button>
        </div>
      </section>

      <Card className="border-border/80">
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardDescription>Database status</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 ${statusTone}`} />
              {data.database.reachable ? "Database reachable" : "Database attention needed"}
            </CardTitle>
          </div>
          <div className="text-sm text-muted-foreground">Checked {formatCheckedAt(data.checkedAt)}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">Configured</p>
              <p className="mt-2 text-2xl font-semibold">{data.database.configured ? "Yes" : "No"}</p>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">Reachable</p>
              <p className="mt-2 text-2xl font-semibold">{data.database.reachable ? "Yes" : "No"}</p>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">Mode</p>
              <p className="mt-2 text-2xl font-semibold capitalize">{data.database.mode.replace("-", " ")}</p>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">Provider</p>
              <p className="mt-2 text-2xl font-semibold capitalize">{data.database.provider}</p>
            </div>
          </div>

          {data.database.guidance ? (
            <div className="rounded-3xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
              {data.database.guidance}
            </div>
          ) : null}

          {requestError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {requestError}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Inventory sanity check</CardDescription>
            <CardTitle>Live inventory totals</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">Wine records</p>
              <p className="mt-2 text-2xl font-semibold">{data.inventory.wineRecords}</p>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">Total bottles</p>
              <p className="mt-2 text-2xl font-semibold">{data.inventory.totalBottles}</p>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">In cellar bottles</p>
              <p className="mt-2 text-2xl font-semibold">{data.inventory.cellarBottles}</p>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">Drank bottles</p>
              <p className="mt-2 text-2xl font-semibold">{data.inventory.drankBottles}</p>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">Locations</p>
              <p className="mt-2 text-2xl font-semibold">{data.inventory.locations}</p>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">With images</p>
              <p className="mt-2 text-2xl font-semibold">{data.inventory.withImages}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Coverage and fallback</CardDescription>
            <CardTitle>Operational signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-secondary/60 p-4">
                <p className="text-sm text-muted-foreground">With Vivino scores</p>
                <p className="mt-2 text-2xl font-semibold">{data.inventory.withVivinoScores}</p>
              </div>
              <div className="rounded-3xl bg-secondary/60 p-4">
                <p className="text-sm text-muted-foreground">Manual Vivino overrides</p>
                <p className="mt-2 text-2xl font-semibold">{data.inventory.manualVivinoOverrides}</p>
              </div>
              <div className="rounded-3xl bg-secondary/60 p-4">
                <p className="text-sm text-muted-foreground">Fallback file wines</p>
                <p className="mt-2 text-2xl font-semibold">{data.fallback.fileWineRecords}</p>
              </div>
              <div className="rounded-3xl bg-secondary/60 p-4">
                <p className="text-sm text-muted-foreground">Fallback file locations</p>
                <p className="mt-2 text-2xl font-semibold">{data.fallback.fileLocationRecords}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileWarning className="h-4 w-4 text-amber-600" />
                Fallback risk
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {data.fallback.active
                  ? "The app is currently using local JSON fallback mode."
                  : "Local fallback files exist on disk but are not used while the database stays healthy."}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Alerts and guidance</CardDescription>
          <CardTitle>What needs attention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.alerts.length === 0 ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              Everything looks healthy right now. Database access and core inventory signals are behaving normally.
            </div>
          ) : (
            data.alerts.map((alert) => (
              <div
                key={`${alert.severity}-${alert.title}`}
                className={`rounded-3xl border p-4 text-sm ${
                  alert.severity === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : alert.severity === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-sky-200 bg-sky-50 text-sky-700"
                }`}
              >
                <p className="font-medium">{alert.title}</p>
                <p className="mt-1">{alert.detail}</p>
              </div>
            ))
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Database className="h-4 w-4" />
                Database
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                If records suddenly disappear, check this page first before assuming deletion.
              </p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wine className="h-4 w-4" />
                Inventory counts
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Compare wine records and total bottles here against what you expect from the cellar.
              </p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ImageIcon className="h-4 w-4" />
                Coverage
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Image and Vivino coverage helps catch partial imports or broken enrichment early.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Backups and recovery</CardDescription>
          <CardTitle>Recovery playbook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Database className="h-4 w-4" />
                Before risky changes
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                In Neon, create a manual branch or snapshot before schema changes, bulk imports, or major cleanup.
              </p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <HardDriveDownload className="h-4 w-4" />
                External backup
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Export a periodic PostgreSQL dump from Neon for an offline recovery copy if you want protection beyond branch restore.
              </p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                If data disappears
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Check this page first. If Neon is paused or unreachable, fix that before assuming the records were deleted.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
            <p className="text-sm font-medium">Suggested routine</p>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>1. Before schema changes or bulk edits: create a Neon branch or snapshot.</li>
              <li>2. Keep code changes in Git so Vercel deployments can be rolled back safely.</li>
              <li>3. For extra safety, export a manual PostgreSQL dump on a schedule you are comfortable with.</li>
              <li>4. If inventory suddenly goes empty, open Monitoring first and confirm the database is reachable.</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
