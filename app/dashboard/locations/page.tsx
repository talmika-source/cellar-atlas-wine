import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StorageLocationsPanel } from "@/components/dashboard/storage-locations-panel";

export default function LocationsPage() {
  return (
    <DashboardShell pathname="/dashboard/locations">
      <StorageLocationsPanel />
    </DashboardShell>
  );
}
