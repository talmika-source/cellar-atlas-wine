import { ReactNode, Suspense } from "react";

import { EditorAuthGate } from "@/components/dashboard/editor-auth-gate";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export function DashboardShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="mx-auto grid max-w-[1600px] gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Sidebar pathname={pathname} />
        <main className="space-y-6">
          <EditorAuthGate />
          <Suspense fallback={<div className="h-[88px] rounded-[1.75rem] border border-border/80 bg-card/80" />}>
            <Topbar />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
