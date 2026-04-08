"use client";

import { ReactNode, Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { EditorAuthGate } from "@/components/dashboard/editor-auth-gate";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export function DashboardShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  const { databaseIssue, refreshAll, winesLoading, locationsLoading } = useDashboardData();

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="mx-auto grid max-w-[1600px] gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Sidebar pathname={pathname} />
        <main className="space-y-6">
          <EditorAuthGate />
          {databaseIssue.active ? (
            <div className="rounded-[1.75rem] border border-amber-300/70 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    {databaseIssue.title}
                  </div>
                  <p className="text-sm font-medium">{databaseIssue.message}</p>
                  {databaseIssue.guidance ? <p className="text-sm text-amber-800/90">{databaseIssue.guidance}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void refreshAll()}
                    disabled={winesLoading || locationsLoading}
                    className="border-amber-300 bg-white/80 text-amber-900 hover:bg-white"
                  >
                    <RefreshCw className={`h-4 w-4 ${(winesLoading || locationsLoading) ? "animate-spin" : ""}`} />
                    Retry database
                  </Button>
                  <Button asChild className="bg-amber-900 text-white hover:bg-amber-950">
                    <Link href="/dashboard/monitoring">Open Monitoring</Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <Suspense fallback={<div className="h-[88px] rounded-[1.75rem] border border-border/80 bg-card/80" />}>
            <Topbar />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
