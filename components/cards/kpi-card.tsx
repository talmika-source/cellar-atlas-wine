import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string;
  trend: string;
  tone?: "default" | "success" | "warning" | "danger";
};

const toneStyles = {
  default: "text-primary",
  success: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-rose-500"
};

export function KpiCard({ label, value, trend, tone = "default" }: KpiCardProps) {
  const isPositive = trend.startsWith("+");
  const isNeutral = !trend.startsWith("+") && !trend.startsWith("-");
  const Icon = isNeutral ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card>
      <CardHeader className="pb-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 pt-0">
        <Icon className={cn("h-4 w-4", toneStyles[tone])} />
        <span className="text-sm text-muted-foreground">{trend}</span>
      </CardContent>
    </Card>
  );
}
