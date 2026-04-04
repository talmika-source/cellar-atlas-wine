import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-provider";

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <DashboardDataProvider>{children}</DashboardDataProvider>;
}
