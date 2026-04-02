import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WineInventoryPanel } from "@/components/dashboard/wine-inventory-panel";

export default function InventoryPage({
  searchParams
}: {
  searchParams?: { q?: string; action?: string };
}) {
  return (
    <DashboardShell pathname="/dashboard/inventory">
      <WineInventoryPanel query={searchParams?.q} action={searchParams?.action} />
    </DashboardShell>
  );
}
