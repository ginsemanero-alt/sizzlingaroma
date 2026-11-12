import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { BestSellerRow } from "@/lib/types";
import { addDaysISO, cn, formatPeso, formatQty, manilaDayStart, todayISO } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { PillFilter } from "@/components/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Best Sellers" };

function range(period: string) {
  const today = todayISO();
  if (period === "month") {
    const start = `${today.slice(0, 7)}-01`;
    return { from: start, label: "This month" };
  }
  if (period === "30") return { from: addDaysISO(today, -29), label: "Last 30 days" };
  // this week: Monday-start
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  return { from: addDaysISO(today, -dow), label: "This week" };
}

export default async function BestSellersPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireAccess("bestSellers");
  const { period = "week" } = await searchParams;
  const r = range(period);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("best_sellers", {
    p_from: manilaDayStart(r.from),
    p_to: manilaDayStart(addDaysISO(todayISO(), 1)),
    p_limit: 50,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as BestSellerRow[];
  const max = Math.max(1, ...rows.map((x) => Number(x.quantity)));
  const totalQty = rows.reduce((s, x) => s + Number(x.quantity), 0);
  const totalRev = rows.reduce((s, x) => s + Number(x.revenue), 0);
  const medal = ["bg-primary text-white", "bg-ink text-white", "bg-[#ffb35c] text-ink"];

  return (
    <div>
      <PageHeader title="Best Sellers" subtitle={`Ranked by quantity sold · ${r.label}`} />
      <div className="space-y-4">
        <PillFilter name="period" value={period === "month" || period === "30" ? period : "week"} options={[{ value: "week", label: "This week" }, { value: "month", label: "This month" }, { value: "30", label: "Last 30 days" }]} />
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-5"><p className="text-xs font-bold uppercase text-muted">Items sold</p><p className="text-3xl font-black">{formatQty(totalQty)}</p></div>
          <div className="card p-5"><p className="text-xs font-bold uppercase text-muted">Revenue</p><p className="text-2xl font-black sm:text-3xl">{formatPeso(totalRev)}</p></div>
        </div>
        {rows.length === 0 ? (
          <div className="card"><EmptyState icon={<Trophy className="size-7" />} title="No sales in this period" description="Record sales to see your top menu items." /></div>
        ) : (
          <ol className="card divide-y divide-sand p-2">
            {rows.map((x, i) => (
              <li key={x.menu_item_id} className="flex items-center gap-4 p-3">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl text-base font-black", medal[i] ?? "bg-sand text-ink")}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="truncate font-bold">{x.name}</p>
                    <p className="text-sm"><strong className="font-black">{formatQty(x.quantity)}</strong> <span className="text-muted">sold · {formatPeso(x.revenue)}</span></p>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-sand" aria-hidden>
                    <div className={cn("h-2.5 rounded-full", i === 0 ? "bg-primary" : "bg-primary/60")} style={{ width: `${(Number(x.quantity) / max) * 100}%` }} />
                  </div>
                  {x.category_name && <p className="mt-1 text-xs text-muted">{x.category_name}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
