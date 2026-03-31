import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "ILS") {
  if (currency === "ILS") {
    const formatter = new Intl.NumberFormat("en-IL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: value > 100 ? 0 : 2
    });

    return `${formatter.format(value)} ₪`;
  }

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency,
    maximumFractionDigits: value > 100 ? 0 : 2
  }).format(value);
}

export function formatPercent(value: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${value >= 0 ? "+" : ""}${formatter.format(value)}%`;
}

export function formatDate(date: string | Date) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}
