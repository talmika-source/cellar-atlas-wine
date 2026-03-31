import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WineOverview } from "@/components/dashboard/wine-overview";

export default function OverviewPage() {
  return (
    <DashboardShell pathname="/dashboard/overview">
      <WineOverview />
    </DashboardShell>
  );
}
