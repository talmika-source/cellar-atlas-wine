import Link from "next/link";
import type { Route } from "next";

import { Activity, Building2, LayoutDashboard, MapPin, Package, Table2 } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Overview",
    href: "/dashboard/overview" as Route,
    icon: LayoutDashboard
  },
  {
    title: "Inventory",
    href: "/dashboard/inventory" as Route,
    icon: Package
  },
  {
    title: "Locations",
    href: "/dashboard/locations" as Route,
    icon: MapPin
  },
  {
    title: "Producers",
    href: "/dashboard/producers" as Route,
    icon: Building2
  },
  {
    title: "Report",
    href: "/dashboard/report" as Route,
    icon: Table2
  },
  {
    title: "Monitoring",
    href: "/dashboard/monitoring" as Route,
    icon: Activity
  }
];

export function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="w-full rounded-[1.75rem] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(11,23,43,0.98),rgba(17,31,56,0.96))] px-5 py-6 text-slate-50 shadow-panel lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-72">
      <div className="flex items-center gap-3 border-b border-slate-700/80 pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-400/15 text-base font-semibold text-teal-200 ring-1 ring-teal-300/20">
          TA
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Private cellar</p>
          <h1 className="text-xl font-semibold">Wine Inventory - Tal Amram</h1>
        </div>
      </div>

      <nav className="mt-6 space-y-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                active
                  ? "bg-teal-500/14 text-white ring-1 ring-teal-300/20"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden rounded-[1.5rem] bg-gradient-to-br from-teal-400/16 via-slate-400/10 to-slate-200/5 p-5 ring-1 ring-slate-500/20 lg:block">
        <p className="text-lg font-semibold text-slate-100">Tal&apos;s Celler</p>
      </div>
    </aside>
  );
}
