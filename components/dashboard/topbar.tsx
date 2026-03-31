"use client";

import { useEffect, useState, useTransition } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  const updateSearch = (value: string) => {
    setSearch(value);

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (value.trim()) {
        params.set("q", value);
      } else {
        params.delete("q");
      }

      const query = params.toString();
      router.replace((query ? `${pathname}?${query}` : pathname) as Route);
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-[1.75rem] border border-border/80 bg-card/80 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="relative w-full max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search wines, producers, regions, fridges, and shelves"
          value={search}
          onChange={(event) => updateSearch(event.target.value)}
        />
      </div>
      <div className="flex items-center gap-3 self-end md:self-auto">
        {isPending ? <span className="text-xs text-muted-foreground">Searching...</span> : null}
        <Button variant="outline" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <Avatar>
          <AvatarFallback>CA</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
