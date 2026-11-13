import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ChartColumn, ChevronRight, Package, Receipt, ScanBarcode, Trophy, TriangleAlert } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import type { BestSellerRow, DashboardStats, ProductRow } from "@/lib/types";
import { addDaysISO, formatPeso, formatQty, manilaDayStart, todayISO } from "@/lib/utils";
import { SearchBar } from "@/components/search-bar";
import { getSalesDaily } from "@/lib/analytics";
import { SalesChart } from "../analytics/charts";
import { StatusBar } from "@/components/charts/status-bar";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpiryBadge, StockBadge } from "@/components/ui/badges";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile } = await requireAccess("dashboard");
  const supabase = await createClient();
  const today = todayISO();

  const [statsRes, bestRes, lowRes, expRes, daily, statusRes] = await Promise.all([
    supabase.rpc("dashboard_stats"),
    supabase.rpc("best_sellers", { p_from: manilaDayStart(addDaysISO(today, -6)), p_to: manilaDayStart(addDaysISO(today, 1)), p_limit: 5 }),
    supabase.from("product_inventory").select("*").in("stock_status", ["low", "out"]).order("quantity").limit(6),
    supabase.from("product_inventory").select("*").not("expiry_date", "is", null).gt("quantity", 0)
      .lte("expiry_date", addDaysISO(today, 7)).order("expiry_date").limit(6),
    getSalesDaily(14),
    supabase.from("product_inventory").select("stock_status"),
  ]);
  const status = { ok: 0, low: 0, out: 0 };
  for (const r of (statusRes.data ?? []) as { stock_status: "ok" | "low" | "out" }[]) status[r.stock_status] += 1;
  const week = daily.slice(-7).reduce((s, d) => s + d.revenue, 0);
  const prevWeek = daily.slice(0, 7).reduce((s, d) => s + d.revenue, 0);
  const weekChange = prevWeek ? Math.round(((week - prevWeek) / prevWeek) * 100) : null;
  if (statsRes.error) throw new Error(statsRes.error.message);

  const stats = statsRes.data as DashboardStats;
  const best = (bestRes.data ?? []) as BestSellerRow[];
  const low = (lowRes.data ?? []) as ProductRow[];
  const expiring = (expRes.data ?? []) as ProductRow[];
  const maxQty = Math.max(1, ...best.map((b) => Number(b.quantity)));
  const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(new Date()));
  const greeting = hour < 12 ? "Magandang umaga" : hour < 18 ? "Magandang hapon" : "Magandang gabi";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[3.5rem] bg-ink p-7 text-white shadow-soft sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-primary/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 right-40 size-56 rounded-full bg-[#ffb35c]/30 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/60">{greeting}, {profile.name.split(" ")[0] || "there"} 👋</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">Kitchen at a glance</h1>
            <p className="mt-2 max-w-md text-sm text-white/60">Live stock, expiry and sales for Sizzling Aroma.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/scan" className="btn-primary"><ScanBarcode className="size-4" /> Scan In/Out</Link>
            <Link href="/sales/new" className="btn bg-white/10 text-white hover:bg-white/20"><Receipt className="size-4" /> Record Sale</Link>
          </div>
        </div>
      </section>

      <SearchBar />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard href="/products" label="Total Products" value={formatQty(stats.total_products)} icon={<Package className="size-6" />} tone="ink" />
        <StatCard
          href="/products?status=low"
          label="Low Stock Items"
          value={formatQty(stats.low_stock)}
          hint={stats.out_of_stock ? `${stats.out_of_stock} out of stock` : undefined}
          icon={<TriangleAlert className="size-6" />}
          tone={stats.low_stock ? "warn" : "ok"}
        />
        <StatCard href="/expiry" label="Near Expiry" value={formatQty(stats.near_expiry)} hint="Within 7 days" icon={<CalendarClock className="size-6" />} tone={stats.near_expiry ? "bad" : "ok"} />
        <StatCard
          href={can(profile.role, "reports") ? "/reports/preview?type=sales" : "/best-sellers"}
          label="Today's Sales"
          value={<span className="text-2xl sm:text-3xl">{formatPeso(stats.today_sales)}</span>}
          hint={`${stats.today_orders} order${stats.today_orders === 1 ? "" : "s"} today`}
          icon={<Receipt className="size-6" />}
          tone="primary"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary"><ChartColumn className="size-5" /></span>
              <div>
                <h2 className="font-black">Sales — last 14 days</h2>
                <p className="text-xs text-muted">
                  This week {formatPeso(week)}
                  {weekChange !== null && <span className={weekChange >= 0 ? "font-bold text-ok" : "font-bold text-bad"}> ({weekChange >= 0 ? "+" : ""}{weekChange}% vs last week)</span>}
                </p>
              </div>
            </div>
            <Link href="/analytics" className="btn-ghost !px-3 !py-2 text-xs" aria-label="Open analytics and graphs">More graphs <ChevronRight className="size-4" /></Link>
          </div>
          <SalesChart data={daily} height={220} />
        </section>
        <section className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary"><Package className="size-5" /></span>
            <div>
              <h2 className="font-black">Inventory health</h2>
              <p className="text-xs text-muted">Products by stock status</p>
            </div>
          </div>
          <StatusBar {...status} />
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Best-Selling Foods" subtitle="Last 7 days" href="/best-sellers" icon={<Trophy className="size-5" />}>
          {best.length === 0 ? (
            <EmptyState title="No sales yet" description="Recorded sales will rank here." icon={<Trophy className="size-7" />} className="py-8" />
          ) : (
            <ol className="space-y-3">
              {best.map((b, i) => (
                <li key={b.menu_item_id} className="flex items-center gap-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black ${i === 0 ? "bg-primary text-white" : "bg-sand text-ink"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-bold">{b.name}</p>
                      <p className="shrink-0 text-xs font-bold text-muted">{formatQty(b.quantity)} sold</p>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-sand">
                      <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${(Number(b.quantity) / maxQty) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Low-Stock Alerts" subtitle="At or below minimum" href="/products?status=low" icon={<TriangleAlert className="size-5" />}>
          {low.length === 0 ? (
            <EmptyState title="All stocked up" description="Nothing is below its minimum level." icon={<Package className="size-7" />} className="py-8" />
          ) : (
            <ul className="divide-y divide-sand">
              {low.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-muted">{formatQty(p.quantity)} {p.unit} left · min {formatQty(p.min_stock)}</p>
                  </div>
                  <StockBadge status={p.stock_status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Expiring Soon" subtitle="Next 7 days & expired" href="/expiry" icon={<CalendarClock className="size-5" />}>
          {expiring.length === 0 ? (
            <EmptyState title="Nothing expiring" description="No stock expires in the next 7 days." icon={<CalendarClock className="size-7" />} className="py-8" />
          ) : (
            <ul className="divide-y divide-sand">
              {expiring.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-muted">{formatQty(p.quantity)} {p.unit} in stock</p>
                  </div>
                  <ExpiryBadge date={p.expiry_date} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, href, icon, children }: { title: string; subtitle: string; href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary">{icon}</span>
          <div>
            <h2 className="font-black">{title}</h2>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        <Link href={href} className="btn-ghost !px-3 !py-2 text-xs" aria-label={`View all: ${title}`}>
          View <ChevronRight className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}
