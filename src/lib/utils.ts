import { clsx, type ClassValue } from "clsx";
import { APP_TIMEZONE } from "./env";
import type { StockStatus } from "./types";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });
export const formatPeso = (n: number | string | null | undefined) => peso.format(Number(n ?? 0));

export function formatQty(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return Number.isInteger(v) ? v.toLocaleString("en-PH") : v.toLocaleString("en-PH", { maximumFractionDigits: 3 });
}

export function formatDate(d: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return "—";
  const date = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00+08:00`) : new Date(d);
  return date.toLocaleDateString("en-PH", { timeZone: APP_TIMEZONE, month: "short", day: "numeric", year: "numeric", ...opts });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-PH", {
    timeZone: APP_TIMEZONE, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

/** Today's date (YYYY-MM-DD) in Manila. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Start of a Manila calendar day as an ISO timestamp. */
export const manilaDayStart = (iso: string) => new Date(`${iso}T00:00:00+08:00`).toISOString();

export function daysUntil(dateISO: string | null): number | null {
  if (!dateISO) return null;
  const today = new Date(`${todayISO()}T00:00:00Z`).getTime();
  const target = new Date(`${dateISO}T00:00:00Z`).getTime();
  return Math.round((target - today) / 86_400_000);
}

export type ExpiryBucket = "expired" | "3" | "7" | "14" | "later" | "none";
export function expiryBucket(dateISO: string | null): ExpiryBucket {
  const d = daysUntil(dateISO);
  if (d === null) return "none";
  if (d < 0) return "expired";
  if (d <= 3) return "3";
  if (d <= 7) return "7";
  if (d <= 14) return "14";
  return "later";
}

export const STOCK_LABEL: Record<StockStatus, string> = { ok: "OK", low: "Low", out: "Out" };

export const isISODate = (s: string | undefined | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
