import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WineReportPanel } from "@/components/dashboard/wine-report-panel";

export default function ReportPage() {
  return (
    <DashboardShell pathname="/dashboard/report">
      <WineReportPanel />
    </DashboardShell>
  );
}
