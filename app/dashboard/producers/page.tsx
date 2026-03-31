import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProducerDirectory } from "@/components/dashboard/producer-directory";

export default function ProducersPage() {
  return (
    <DashboardShell pathname="/dashboard/producers">
      <ProducerDirectory />
    </DashboardShell>
  );
}
