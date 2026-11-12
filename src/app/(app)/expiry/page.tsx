import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CalendarX, ScanBarcode } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/types";
import { addDaysISO, cn, expiryBucket, formatDate, formatQty, todayISO, type ExpiryBucket } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpiryBadge } from "@/components/ui/badges";

export const metadata: Metadata = { title: "Expiry Tracking" };

const GROUPS: { key: Exclude<ExpiryBucket, "later" | "none">; title: string; hint: string; tone: string; dot: string }[] = [
  { key: "expired", title: "Expired", hint: "Remove from use", tone: "bg-bad-soft text-bad", dot: "bg-bad" },
  { key: "3", title: "Within 3 days", hint: "Use first", tone: "bg-bad-soft text-bad", dot: "bg-bad" },
  { key: "7", title: "Within 7 days", hint: "Plan to use soon", tone: "bg-warn-soft text-warn", dot: "bg-warn" },
  { key: "14", title: "Within 14 days", hint: "Keep an eye on it", tone: "bg-primary-soft text-primary-dark", dot: "bg-primary" },
];

export default async function ExpiryPage() {
  await requireAccess("expiry");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_inventory")
    .select("*")
    .not("expiry_date", "is", null)
    .gt("quantity", 0)
    .lte("expiry_date", addDaysISO(todayISO(), 14))
    .order("expiry_date");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ProductRow[];
  const grouped = Object.fromEntries(GROUPS.map((g) => [g.key, rows.filter((r) => expiryBucket(r.expiry_date) === g.key)])) as Record<string, ProductRow[]>;

  return (
    <div>
      <PageHeader
        title="Expiry Tracking"
        subtitle="Items in stock grouped by how soon they expire."
        actions={<Link href="/scan?mode=out" className="btn-ghost"><ScanBarcode className="size-4" /> Scan out expired</Link>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {GROUPS.map((g) => (
          <a key={g.key} href={`#exp-${g.key}`} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
            <span className={cn("grid size-12 place-items-center rounded-2xl text-xl font-black", g.tone)}>{grouped[g.key].length}</span>
            <span className="text-sm font-bold leading-tight">{g.title}</span>
          </a>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="card"><EmptyState icon={<CalendarClock className="size-7" />} title="Nothing expiring in 14 days" description="Set expiry dates when receiving stock (Scan In or Add product) to track them here." /></div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.key} id={`exp-${g.key}`} className="card scroll-mt-24 p-6" aria-labelledby={`exp-h-${g.key}`}>
              <div className="mb-3 flex items-center gap-3">
                <span className={cn("size-3 rounded-full", g.dot)} aria-hidden />
                <h2 id={`exp-h-${g.key}`} className="font-black">{g.title}</h2>
                <span className="text-xs text-muted">· {g.hint}</span>
              </div>
              {grouped[g.key].length === 0 ? (
                <p className="flex items-center gap-2 py-6 text-sm text-muted"><CalendarX className="size-4" /> None</p>
              ) : (
                <ul className="divide-y divide-sand">
                  {grouped[g.key].map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{p.name}</p>
                        <p className="text-xs text-muted">{formatQty(p.quantity)} {p.unit} · expires {formatDate(p.expiry_date)}{p.supplier ? ` · ${p.supplier}` : ""}</p>
                      </div>
                      <ExpiryBadge date={p.expiry_date} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
