import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics";
import { cn, formatDate, formatPeso, formatQty } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { PillFilter } from "@/components/filter-bar";
import { BarList } from "@/components/charts/bar-list";
import { StatusBar } from "@/components/charts/status-bar";
import { IN_COLOR, OUT_COLOR, SalesChart, StockFlowChart } from "./charts";

export const metadata: Metadata = { title: "Analytics & Graphs" };

const PERIODS = { "7": 7, "30": 30, "90": 90 } as const;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAccess("analytics");
  const { days: d = "30" } = await searchParams;
  const key = (d in PERIODS ? d : "30") as keyof typeof PERIODS;
  const a = await getAnalytics(PERIODS[key]);
  const flow = a.days.map((x) => ({ ...x, out: Math.round((x.stockOut + x.saleUse) * 100) / 100 }));
  const best = [...a.days].sort((x, y) => y.revenue - x.revenue)[0];

  return (
    <div>
      <PageHeader title="Analytics & Graphs" subtitle={`Sales and inventory performance · ${formatDate(a.from)} – ${formatDate(a.to)}`} />
      <div className="space-y-6">
        <PillFilter name="days" value={key} options={[{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }]} />

        <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Sales" value={formatPeso(a.totals.revenue)} change={a.previous ? pct(a.totals.revenue, a.previous.revenue) : null} />
          <Kpi label="Orders" value={formatQty(a.totals.orders)} change={a.previous ? pct(a.totals.orders, a.previous.orders) : null} />
          <Kpi label="Avg. order" value={formatPeso(a.totals.avgOrder)} />
          <Kpi label="Items sold" value={formatQty(a.totals.items)} />
        </section>

        <Card title="Sales per day" subtitle={best && best.revenue > 0 ? `Best day: ${formatDate(best.date, { weekday: "short" })} · ${formatPeso(best.revenue)}` : "Revenue from recorded sales"}>
          <SalesChart data={a.days} height={260} />
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Top 10 menu items" subtitle="By quantity sold">
            <BarList rows={a.topItems.map((t) => ({ label: t.name, value: t.quantity, note: `· ${formatPeso(t.revenue)}` }))} format={formatQty} empty="No sales in this period." />
          </Card>
          <Card title="Sales by category" subtitle="Revenue">
            <BarList rows={a.byCategory.map((c) => ({ label: c.name, value: c.revenue, note: `· ${formatQty(c.quantity)} sold` }))} format={formatPeso} empty="No sales in this period." />
          </Card>
        </div>

        <Card
          title="Stock In vs Stock Out"
          subtitle="Value per day (quantity × unit cost) — scanned, manual and automatic sale deductions"
          aside={
            <div className="flex gap-3 text-right text-xs">
              <div><p className="font-bold text-muted">In</p><p className="font-black" style={{ color: IN_COLOR }}>{formatPeso(a.totals.stockIn)}</p></div>
              <div><p className="font-bold text-muted">Out</p><p className="font-black" style={{ color: OUT_COLOR }}>{formatPeso(a.totals.stockOut)}</p></div>
            </div>
          }
        >
          <StockFlowChart data={flow} />
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Inventory health" subtitle="Products by stock status (right now)">
            <StatusBar {...a.status} />
          </Card>
          <Card title="Stock value by category" subtitle="Quantity on hand × unit cost (right now)">
            <BarList rows={a.valueByCategory.map((c) => ({ label: c.name, value: c.value }))} color={IN_COLOR} format={formatPeso} empty="No stock on hand." />
          </Card>
        </div>
      </div>
    </div>
  );
}

function pct(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

function Kpi({ label, value, change }: { label: string; value: string; change?: number | null }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-bold uppercase text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{value}</p>
      {change !== undefined && change !== null && (
        <p className={cn("mt-1 flex items-center gap-1 text-xs font-bold", change > 0 ? "text-ok" : change < 0 ? "text-bad" : "text-muted")}>
          {change > 0 ? <ArrowUpRight className="size-3.5" /> : change < 0 ? <ArrowDownRight className="size-3.5" /> : <Minus className="size-3.5" />}
          {change > 0 ? "+" : ""}{change}% vs previous period
        </p>
      )}
    </div>
  );
}

function Card({ title, subtitle, aside, children }: { title: string; subtitle?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-black">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
