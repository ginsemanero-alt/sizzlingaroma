import type { AppRole } from "./types";

export type NavKey =
  | "dashboard" | "products" | "inventory" | "scan" | "movements" | "expiry"
  | "sale" | "bestSellers" | "analytics" | "reports" | "labels" | "menu" | "users" | "search";

/** Single source of truth for page access. The database (RLS + functions) enforces the same rules. */
export const ACCESS: Record<NavKey, AppRole[]> = {
  dashboard: ["owner", "staff"],
  products: ["owner", "staff"],
  inventory: ["owner", "staff", "kitchen", "dine_in"],
  scan: ["owner", "staff", "kitchen", "dine_in"],
  movements: ["owner", "kitchen", "dine_in"],
  expiry: ["owner", "staff", "kitchen", "dine_in"],
  sale: ["owner", "staff"],
  bestSellers: ["owner", "staff"],
  analytics: ["owner", "staff"],
  reports: ["owner"],
  labels: ["owner", "staff"],
  menu: ["owner"],
  users: ["owner"],
  search: ["owner", "staff"],
};

export const can = (role: AppRole | null | undefined, key: NavKey) => !!role && ACCESS[key].includes(role);

export const canManageProducts = (role: AppRole | null | undefined) => role === "owner";

export function homePathFor(role: AppRole): string {
  return role === "owner" || role === "staff" ? "/dashboard" : "/inventory";
}

export const ROLE_LABEL: Record<AppRole, string> = {
  owner: "Owner",
  staff: "Staff",
  kitchen: "Kitchen",
  dine_in: "Dine-in",
};

/** Location code a role is locked to (null = all locations). */
export function lockedLocationCode(role: AppRole): string | null {
  if (role === "kitchen") return "kitchen";
  if (role === "dine_in") return "dine_in";
  return null;
}
