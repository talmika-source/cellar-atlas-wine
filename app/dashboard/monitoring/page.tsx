import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MonitoringPanel } from "@/components/dashboard/monitoring-panel";

export default function MonitoringPage() {
  return (
    <DashboardShell pathname="/dashboard/monitoring">
      <MonitoringPanel />
    </DashboardShell>
  );
}
