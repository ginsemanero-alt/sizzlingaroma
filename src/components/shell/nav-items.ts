import {
  Boxes, CalendarClock, ChartColumn, ChefHat, FileChartColumn, History, LayoutDashboard, Package, Receipt,
  ScanBarcode, Tag, Trophy, Users, type LucideIcon,
} from "lucide-react";
import type { NavKey } from "@/lib/permissions";

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { key: "products", href: "/products", label: "Products", short: "Products", icon: Package },
  { key: "inventory", href: "/inventory", label: "Inventory", short: "Stock", icon: Boxes },
  { key: "scan", href: "/scan", label: "Scan In / Out", short: "Scan", icon: ScanBarcode },
  { key: "sale", href: "/sales/new", label: "Record Sale", short: "Sale", icon: Receipt },
  { key: "expiry", href: "/expiry", label: "Expiry Tracking", short: "Expiry", icon: CalendarClock },
  { key: "analytics", href: "/analytics", label: "Analytics & Graphs", short: "Graphs", icon: ChartColumn },
  { key: "bestSellers", href: "/best-sellers", label: "Best Sellers", short: "Best", icon: Trophy },
  { key: "movements", href: "/movements", label: "Stock Movement Log", short: "Log", icon: History },
  { key: "labels", href: "/labels", label: "Barcode Labels", short: "Labels", icon: Tag },
  { key: "reports", href: "/reports", label: "Reports", short: "Reports", icon: FileChartColumn },
  { key: "menu", href: "/menu", label: "Menu & Recipes", short: "Menu", icon: ChefHat },
  { key: "users", href: "/users", label: "Users", short: "Users", icon: Users },
];

/** Bottom bar priority on phones (rest goes into "More"). */
export const MOBILE_PRIMARY: NavKey[] = ["dashboard", "inventory", "scan", "sale", "products"];
